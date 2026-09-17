import nbformat
import os

os.chdir(r'd:\model\new - Copy')

with open('01_prepare_data.ipynb', 'r', encoding='utf-8') as f:
    nb = nbformat.read(f, as_version=4)

print(f'cells: {len(nb.cells)}')

has_tokenizer = any(
    'AutoTokenizer.from_pretrained' in ''.join(cell.source)
    for cell in nb.cells
    if cell.cell_type == 'code'
)
print(f'has tokenizer cell: {has_tokenizer}')

if not has_tokenizer:
    src = 'tokenizer = AutoTokenizer.from_pretrained("airesearch/wangchanberta-base-att-spm-uncased")\nprint("Tokenizer loaded")'
    new_cell = nbformat.v4.new_code_cell(source=src)
    for i, cell in enumerate(nb.cells):
        if cell.cell_type == 'code' and 'def tokenize_function' in ''.join(cell.source):
            nb.cells.insert(i, new_cell)
            print(f'Inserted at index {i}')
            break

with open('01_prepare_data_fixed.ipynb', 'w', encoding='utf-8') as f:
    nbformat.write(nb, f)

print('Saved: 01_prepare_data_fixed.ipynb')
