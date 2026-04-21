import csv
import io
from app.repos.lawyers import update_lawyer_disciplinary_status

async def import_nba_disciplinary_csv(csv_content: str) -> dict:
    """
    Parses a CSV of lawyer disciplinary records and updates the database.
    Expected CSV Format: lawyer_id,severe_flag,active_complaints
    Example: funke-ade-123,false,0
    """
    results = {
        "processed": 0,
        "updated": 0,
        "errors": []
    }
    
    stream = io.StringIO(csv_content)
    reader = csv.DictReader(stream)
    
    for row in reader:
        results["processed"] += 1
        try:
            lawyer_id = row.get("lawyer_id")
            severe_flag = row.get("severe_flag", "false").lower() == "true"
            active_complaints = int(row.get("active_complaints", 0))
            
            if not lawyer_id:
                results["errors"].append(f"Row {results['processed']}: Missing lawyer_id")
                continue
                
            success = await update_lawyer_disciplinary_status(lawyer_id, severe_flag, active_complaints)
            if success:
                results["updated"] += 1
            else:
                results["errors"].append(f"Row {results['processed']}: Lawyer ID {lawyer_id} not found")
                
        except Exception as e:
            results["errors"].append(f"Row {results['processed']}: {str(e)}")
            
    return results
