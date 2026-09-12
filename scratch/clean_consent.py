with open('frontend/src/features/consent/index.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines before: {len(lines)}")
# Find export function ConsentPage
export_idx = -1
for i, line in enumerate(lines):
    if "export function ConsentPage" in line:
        export_idx = i
        break

print(f"export function ConsentPage found at index {export_idx}")

# Line 237 is const PSYCHOMETRIC_QUESTIONS_BY_LANG
# Line 262 is '  ]\n'
# We close PSYCHOMETRIC_QUESTIONS_BY_LANG with '}\n\n'
new_lines = lines[:263] + ['}\n\n'] + lines[export_idx:]

with open('frontend/src/features/consent/index.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Total lines after: {len(new_lines)}")
print("Cleaned up successfully!")
