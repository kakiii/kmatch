import pandas as pd
import glob
import os
from datetime import datetime
import json

# Get all Excel files in the directory
path = "/Users/ashlee/Documents/Chrome Extensions/kmatch/data/"
files = glob.glob(path + "KMatch - *.xlsx")

# Sort files by date in filename
def extract_date(filename):
    date_str = filename.split(' - ')[1].replace('.xlsx', '')
    return datetime.strptime(date_str, '%d_%m_%Y')

sorted_files = sorted(files, key=extract_date, reverse=True)

if len(sorted_files) < 2:
    print("Need at least 2 files to compare")
    exit()

# Read the two most recent files
latest_file = sorted_files[0]
second_latest_file = sorted_files[1]
print(f"\nComparing files:")
print(f"Latest: {os.path.basename(latest_file)}")
print(f"Previous: {os.path.basename(second_latest_file)}\n")

latest_df = pd.read_excel(latest_file)
second_latest_df = pd.read_excel(second_latest_file)

# Get the second column name from both files
latest_second_col = latest_df.columns[1]
prev_second_col = second_latest_df.columns[1]

print(f"\nSecond column in latest file: {latest_second_col}")
print(f"Second column in previous file: {prev_second_col}")

# Find rows in latest that aren't in second_latest
new_entries = latest_df[~latest_df[latest_second_col].isin(second_latest_df[prev_second_col])]

# Find rows in second_latest that aren't in latest
removed_entries = second_latest_df[~second_latest_df[prev_second_col].isin(latest_df[latest_second_col])]

# Extract date from latest file for naming the output files
latest_date = extract_date(latest_file).strftime('%d_%m_%Y')
new_entries_file = os.path.join(path, f"NewEntries_{latest_date}.xlsx")
removed_entries_file = os.path.join(path, f"RemovedEntries_{latest_date}.xlsx")

if new_entries.empty and removed_entries.empty:
    print("No differences found")
else:
   if not new_entries.empty:
    print(f"\nNew entries in {os.path.basename(latest_file)}: {len(new_entries)} entries")
    print(new_entries)
    new_entries.to_excel(new_entries_file, index=False)
    print(f"New entries exported to: {os.path.basename(new_entries_file)}")
    
    # 直接更新 sponsors.json
    with open('kmatch/sponsors.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 处理每个新公司
    for company in new_entries['Organisation'].tolist():
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
            data['sponsors'][key] = [company]

    # 保存更新后的 JSON
    with open('../sponsors.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("\nsponsors.json has been updated successfully!")
    
    if not removed_entries.empty:
        print(f"\nEntries removed (present in {os.path.basename(second_latest_file)} but not in {os.path.basename(latest_file)}): {len(removed_entries)} entries")
        print(removed_entries)
        removed_entries.to_excel(removed_entries_file, index=False)
        print(f"Removed entries exported to: {os.path.basename(removed_entries_file)}")