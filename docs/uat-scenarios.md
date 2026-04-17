# UAT Scenarios (Pilot)

This checklist mirrors the automated UAT runner in `scripts/uat_runner.py`.

## Covered automated scenarios

1. Health check (`GET /health`)
2. Authentication:
   - Client signup
   - Lawyer signup with `lawyer_id`
   - Admin login
3. Intake matching (`POST /api/intake/match`)
4. Complaint workflow:
   - Create complaint
   - List complaints
   - Admin resolve complaint
5. Conversation workflow:
   - Create conversation
   - Lawyer reply
   - List messages
6. Consultation workflow:
   - Book consultation
   - Initialize + verify payment
   - Upload document
   - List documents
   - Download document

## How to run

```powershell
cd C:\Users\PC\Desktop\nigeria-legal-mvp
c:/python313/python.exe scripts/uat_runner.py --base-url http://127.0.0.1:8000
```

## Pass criteria

- Script exits with code `0`
- Output ends with `UAT passed ✅`

## If UAT fails

- Capture failing step and response payload
- Save request log line with `request_id`
- Log issue and remediation notes in tracker
