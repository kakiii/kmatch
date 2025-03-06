import json
import os
import pandas as pd
import glob
from datetime import datetime

current_dir = os.path.dirname(os.path.abspath(__file__))
excel_files = glob.glob(os.path.join(current_dir, 'KMatch - *.xlsx'))

def extract_date(filename):
    date_str = os.path.basename(filename).split(' - ')[1].replace('.xlsx', '')
    return datetime.strptime(date_str, '%d_%m_%Y')

sorted_files = sorted(excel_files, key=extract_date, reverse=True)

if len(sorted_files) < 2:
    print("Need at least 2 files to compare")
    exit()

latest_file = sorted_files[0]
second_latest_file = sorted_files[1]

latest_df = pd.read_excel(latest_file)
second_latest_df = pd.read_excel(second_latest_file)

new_entries = latest_df[~latest_df.iloc[:, 1].isin(second_latest_df.iloc[:, 1])]
print(f"\nNew entries in {os.path.basename(latest_file)}: {len(new_entries)} entries")
print(new_entries)

removed_entries = second_latest_df[~second_latest_df.iloc[:, 1].isin(latest_df.iloc[:, 1])]
print(f"\nRemoved entries in {os.path.basename(latest_file)}: {len(removed_entries)} entries")
print(removed_entries)

sponsors_path = os.path.join(os.path.dirname(current_dir), 'sponsors.json')

with open(sponsors_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for company in new_entries.iloc[:, 0].tolist():
    company = company.strip()
    if not company:
        continue
        
    key = company.split()[0].lower()
    
    if 'sponsors' in data and key in data['sponsors']:
        if company not in data['sponsors'][key]:
            data['sponsors'][key].append(company)
    else:
        if 'sponsors' not in data:
            data['sponsors'] = {}
        if key not in data['sponsors']:
            data['sponsors'][key] = []
        data['sponsors'][key].append(company)

with open(sponsors_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\nsponsors.json has been updated successfully!")