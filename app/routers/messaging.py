from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional, Dict, List
import json
from datetime import datetime, UTC

from app.dependencies import (
    log_event,
    notify_users,
    require_user,
    require_client,
)
from app.db import (
    create_conversation,
    get_conversation,
    user_can_access_conversation,
    list_conversations_for_user,
    list_conversation_participant_user_ids,
    create_message,
    list_messages,
    get_user_by_access_token,
)
from app.models import (
    ConversationCreateRequest,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

    async def broadcast_to_users(self, message: dict, user_ids: List[int]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()

router = APIRouter(tags=["messaging"])



@router.get("/api/conversations", response_model=list[ConversationResponse])
def list_conversations_endpoint(
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[ConversationResponse]:
    user = require_user(x_auth_token)
    return [
        ConversationResponse(
            conversation_id=item["id"],
            client_user_id=item["client_user_id"],
            lawyer_id=item["lawyer_id"],
            status=item["status"],
            created_on=item["created_on"],
        )
        for item in list_conversations_for_user(user)
    ]


@router.post("/api/conversations", response_model=ConversationResponse)
def open_conversation(
    payload: ConversationCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConversationResponse:
    user = require_client(x_auth_token)
    created = create_conversation(user["id"], payload.lawyer_id, payload.initial_message)
    if created is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    conversation, _ = created
    log_event(user["id"], "conversation.created", "conversation", str(conversation["id"]), "Client opened a conversation")
    notify_users(
        list_conversation_participant_user_ids(conversation["id"]),
        kind="message_received",
        title="New conversation started",
        body=payload.initial_message[:140],
        resource_type="conversation",
        resource_id=str(conversation["id"]),
        exclude_user_id=user["id"],
    )
    return ConversationResponse(
        conversation_id=conversation["id"],
        client_user_id=conversation["client_user_id"],
        lawyer_id=conversation["lawyer_id"],
        status=conversation["status"],
        created_on=conversation["created_on"],
    )

@router.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation_endpoint(
    conversation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> ConversationResponse:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(
        conversation_id=conversation["id"],
        client_user_id=conversation["client_user_id"],
        lawyer_id=conversation["lawyer_id"],
        status=conversation["status"],
        created_on=conversation["created_on"],
    )

@router.post("/api/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> MessageResponse:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    
    message = create_message(conversation_id, user["id"], payload.body)
    if message is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    log_event(user["id"], "message.sent", "message", str(message["id"]), f"Message sent in conversation {conversation_id}")
    
    # WebSocket Broadcast
    participant_ids = list_conversation_participant_user_ids(conversation_id)
    ws_payload = {
        "event": "new_message",
        "timestamp": datetime.now(UTC).isoformat(),
        "data": {
            "message_id": message["id"],
            "conversation_id": conversation_id,
            "sender_user_id": user["id"],
            "body": payload.body,
            "created_on": message["created_on"],
        }
    }
    await manager.broadcast_to_users(ws_payload, participant_ids)

    notify_users(
        participant_ids,
        kind="message_received",
        title="New message received",
        body=payload.body[:140],
        resource_type="conversation",
        resource_id=str(conversation_id),
        exclude_user_id=user["id"],
    )
    return MessageResponse(
        message_id=message["id"],
        conversation_id=message["conversation_id"],
        sender_user_id=message["sender_user_id"],
        body=message["body"],
        created_on=message["created_on"],
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    # Verify token
    if not token:
        await websocket.close(code=1008)
        return
    
    user = get_user_by_access_token(token)
    if not user:
        await websocket.close(code=1008)
        return
    
    user_id = user["id"]
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive, though we mainly do server-to-client pushes
            data = await websocket.receive_text()
            # Handle client-side heartbeat or specific signals if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


@router.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(
    conversation_id: int,
    x_auth_token: Optional[str] = Header(default=None, alias="X-Auth-Token"),
) -> list[MessageResponse]:
    user = require_user(x_auth_token)
    if not user_can_access_conversation(user, conversation_id):
        raise HTTPException(status_code=403, detail="Conversation access denied")
    return [
        MessageResponse(
            message_id=item["id"], 
            conversation_id=item["conversation_id"], 
            sender_user_id=item["sender_user_id"], 
            body=item["body"], 
            created_on=item["created_on"]
        ) 
        for item in list_messages(conversation_id)
    ]
