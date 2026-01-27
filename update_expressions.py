import json
import os
import glob

expressions_dir = r"d:\python\ai_companion\frontend\public\models\mianfeimox\expressions"
param_to_add = {"Id": "Param14", "Value": 1, "Blend": "Add"}

for file_path in glob.glob(os.path.join(expressions_dir, "*.json")):
    if "水印.exp3.json" in file_path:
        continue
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if "Parameters" in data:
            # Check if exists
            exists = False
            for p in data["Parameters"]:
                if p.get("Id") == "Param14":
                    p["Value"] = 1 # Force it to 1 just in case
                    exists = True
                    break
            
            if not exists:
                data["Parameters"].append(param_to_add)
                print(f"Added Param14 to {os.path.basename(file_path)}")
            else:
                print(f"Updated Param14 in {os.path.basename(file_path)}")
                
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent='\t', ensure_ascii=False)
                
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
