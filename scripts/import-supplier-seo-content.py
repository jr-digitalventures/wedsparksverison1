import json
import sys
from pathlib import Path

import openpyxl

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / 'dist' / 'wedding-suppliers' / 'supplier-seo-content.js'
sheet = openpyxl.load_workbook(source, read_only=True, data_only=True).active
rows = list(sheet.iter_rows(values_only=True))

if tuple(rows[0][:3]) != ('Page name', 'SEO H3 heading', 'SEO paragraph'):
    raise ValueError('Expected Page name, SEO H3 heading and SEO paragraph columns.')

content = {}
for row_number, row in enumerate(rows[1:], start=2):
    page_name, heading, paragraph = row[:3]
    if not any((page_name, heading, paragraph)):
        continue
    if not all(isinstance(value, str) and value.strip() for value in (page_name, heading, paragraph)):
        raise ValueError(f'Row {row_number} must contain all three text values.')
    if page_name in content:
        raise ValueError(f'Duplicate page name: {page_name}')
    content[page_name] = {'title': heading.strip(), 'paragraph': paragraph.strip()}

categories = ['Bar Service', 'Cake', 'Catering', 'Celebrant', 'Florist', 'Hair Stylist', 'Hireage', 'Live Entertainment', 'Make-up', 'Photographer', 'Stationary', 'Transport', 'Venue', 'Videographer', 'Wedding Dress']
locations = ['No Location selected or Location selected that IS NOT state or main city', 'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'Canberra, ACT', 'Sydney, NSW', 'Darwin, NT', 'Brisbane, QLD', 'Adelaide, SA', 'Hobart, TAS', 'Melbourne, VIC', 'Perth, WA']
expected = {f'{category} + {location}' for category in categories for location in locations}
expected.add('All wedding suppliers + Any location / no category selected')
missing = expected.difference(content)
unexpected = set(content).difference(expected)
if missing or unexpected:
    raise ValueError(f'Unexpected spreadsheet coverage. Missing: {sorted(missing)}; extra: {sorted(unexpected)}')

content['All wedding suppliers + Any location / no category selected']['title'] = 'Everything You Need for Your Wedding, All in One Place.'

payload = json.dumps(content, ensure_ascii=False, separators=(',', ':'))
destination.write_text(
    '(function(root,factory){const content=factory();if(typeof module===\'object\'&&module.exports)module.exports=content;else root.WEDSPARKS_SUPPLIER_SEO_CONTENT=content;}(typeof globalThis!==\'undefined\'?globalThis:this,function(){return '
    + payload
    + ';}));\n',
    encoding='utf-8'
)
print(f'Imported {len(content)} SEO content entries into {destination}.')
