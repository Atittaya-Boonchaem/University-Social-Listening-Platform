import nbformat, os

os.chdir(r'd:\model\new - Copy')

with open('01_prepare_data_fixed.ipynb', 'r', encoding='utf-8') as f:
    nb = nbformat.read(f, as_version=4)

fixed = 0
for cell in nb.cells:
    if cell.cell_type == 'code' and 'logging_dir' in cell.source:
        lines = cell.source.splitlines()
        new_lines = []
        for line in lines:
            if 'logging_dir' in line:
                print(f'Removed: {line.strip()}')
                fixed += 1
                continue  # ลบ line นี้
            new_lines.append(line)
        cell.source = '\n'.join(new_lines)

print(f'Fixed {fixed} line(s)')

with open('01_prepare_data_fixed.ipynb', 'w', encoding='utf-8') as f:
    nbformat.write(nb, f)

print('Saved.')
