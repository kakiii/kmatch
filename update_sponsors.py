import json

# 读取现有的 JSON 文件
with open('kmatch/sponsors.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 完整的新公司列表
new_companies = """
A Booth B.V.
A3BC B.V.
Aldora Dienstverlening B.V.
All-In Facility Services B.V.
Allroad Projecten B.V.
Almazara B.V.
Ariane Zorggroep B.V.
AV Group B.V.
Bharosa Taaluiting B.V.
Bluespring B.V.
BONATTI S.P.A. DUTCH BRANCH
BrightNight India, B.V.
Chain Fashion Industries
Closing the Loop B.V.
Combifloat Systems B.V.
Companial B.V.
ConnectAir B.V.
Control Union Certifications B.V.
Coöperatie Royal FloraHolland U.A.
CrowdBuilding Tech B.V.
De Bezorgersshop
Defenced B.V.
deugro (Netherlands) B.V.
Ducor Petrochemicals B.V.
Dynamic Uitzendbureau B.V.
E-Flight Academy B.V.
Elision B.V.
FABRICations B.V.
filerskeepers B.V.
Hans Anders Nederland B.V.
Hanwha Ocean Global Project Center B.V.
Hertz Automobielen Nederland B.V.
HL Terminal Holding B.V.
Ideal Pharma B.V.
Industrial Ceramic Linings B.V.
IT Partner B.V.
Kiwatt B.V.
Kodify B.V.
Lightyear Layer
Livekindly Production NL B.V.
Magic Bodyfashion B.V.
Marel Customer Center B.V.
Marel GDC B.V.
Matoke Tours B.V.
Maverix B.V.
Medir International B.V.
MW Investment B.V.
New Black B.V.
Nippon Kaiji Kyokai (Netherlands) B.V.
NMQ Holding B.V.
Northland Power International Holdings B.V.
Oogwereld B.V.
Pally Biscuits B.V.
Palmax Benelux B.V.
Paques Global B.V.
Piano Software B.V.
Platinum Marine Services B.V.
Plukon Processing Ommel B.V.
Poultry Research & Innovation Center B.V.
Prestop B.V.
Producthero B.V.
Quality Produce International (Q.P.I.) B.V.
Radial Software Group B.V.
RAJ Consult B.V.
Recornect B.V.
Resato Hydrogen Technology B.V.
Sauter Building Control Nederland B.V.
Sibelco Nederland N.V.
Sitech Services B.V.
Smartly.io Solutions Oy Netherlands Branch
SoilBeat Holding B.V.
Stichting Innovatiepact Fryslân
Sun-Power Agro Uitzendbureau B.V.
Sushito Zuidas B.V.
Talentix B.V.
TestingXperts B.V.
TOPCHIRO Eindhoven B.V.
Total Design B.V.
TYM EUROPE B.V.
Van Aetsveld
Vemedia Manufacturing B.V
Vintus B.V.
VolkerRail Nederland B.V.
Waterland Projecten B.V.
WIFAC B.V.
William Blair B.V.
Worldwide Flight Services Holland B.V.""".strip().split('\n')

# 处理每个新公司
for company in new_companies:
    # 清理公司名称
    company = company.strip()
    if not company:
        continue
        
    # 获取键名（取第一个单词的小写形式）
    key = company.split()[0].lower()
    
    # 如果键已存在，添加到现有数组
    if 'sponsors' in data and key in data['sponsors']:
        if company not in data['sponsors'][key]:
            data['sponsors'][key].append(company)
    else:
        # 如果键不存在，创建新数组
        if 'sponsors' not in data:
            data['sponsors'] = {}
        data['sponsors'][key] = [company]

# 保存更新后的 JSON
with open('kmatch/sponsors.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)