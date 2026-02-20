with open('components/quote-builder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(2367, 2372):
        print(f"{i+1}: {repr(lines[i])}")
