with open('frontend/src/features/consent/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('scratch/lines_180_245.txt', 'w', encoding='utf-8') as out:
    for i, l in enumerate(lines[180:245]):
        out.write(f"{i+181}: {l}")

print("Wrote lines 181-245")
