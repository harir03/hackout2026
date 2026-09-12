with open('frontend/src/features/consent/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('scratch/lines_240_300.txt', 'w', encoding='utf-8') as out:
    for i, l in enumerate(lines[240:300]):
        out.write(f"{i+241}: {l}")

print("Wrote lines 241-300 to scratch/lines_240_300.txt")
