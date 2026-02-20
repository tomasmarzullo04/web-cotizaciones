with open('components/quote-builder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(2503, 2509):
        print(f"{i+1}: {repr(lines[i])}")
