import json
import os
import pandas as pd
import glob
from datetime import datetime

# 获取数据文件路径
current_dir = os.path.dirname(os.path.abspath(__file__))
excel_files = glob.glob(os.path.join(current_dir, 'KMatch - *.xlsx'))

# 按日期排序文件
def extract_date(filename):
    date_str = os.path.basename(filename).split(' - ')[1].replace('.xlsx', '')
    return datetime.strptime(date_str, '%d_%m_%Y')

sorted_files = sorted(excel_files, key=extract_date, reverse=True)

if len(sorted_files) < 2:
    print("Need at least 2 files to compare")
    exit()

# 读取最新的两个文件
latest_file = sorted_files[0]
second_latest_file = sorted_files[1]

# 读取数据
latest_df = pd.read_excel(latest_file)
second_latest_df = pd.read_excel(second_latest_file)

# 使用第二列（索引1）进行对比
new_entries = latest_df[~latest_df.iloc[:, 1].isin(second_latest_df.iloc[:, 1])]
print(f"\nNew entries in {os.path.basename(latest_file)}: {len(new_entries)} entries")
print(new_entries)

# 找出删除的公司
removed_entries = second_latest_df[~second_latest_df.iloc[:, 1].isin(latest_df.iloc[:, 1])]
print(f"\nRemoved entries in {os.path.basename(latest_file)}: {len(removed_entries)} entries")
print(removed_entries)

# 读取 sponsors.json
sponsors_path = os.path.join(os.path.dirname(current_dir), 'sponsors.json')

with open(sponsors_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 处理每个新公司（使用第一列的Organisation）
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

# 保存更新后的 JSON
with open(sponsors_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\nsponsors.json has been updated successfully!")