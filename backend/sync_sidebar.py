import os
import re

base_dir = '/Users/rhmnhsim/ouwibo-agent/static'
index_path = os.path.join(base_dir, 'index.html')

with open(index_path, 'r', encoding='utf-8') as f:
    index_content = f.read()

# Extract from <aside class="sidebar" id="sidebar"> to </aside>
match = re.search(r'(<aside class="sidebar" id="sidebar">.*?</aside>)', index_content, re.DOTALL)
if not match:
    print("Could not find sidebar in index.html")
    exit(1)

sidebar_html = match.group(1)

# Remove the hardcoded active state from index's chat link in the extracted block
# from: class="nav-item nav-item--active"
# to:   class="nav-item"
clean_sidebar = sidebar_html.replace('class="nav-item nav-item--active"', 'class="nav-item"')

targets = {
    'index.html':  ('/" class="nav-item"', '/" class="nav-item nav-item--active"'),
    'search.html': ('/search.html" class="nav-item"', '/search.html" class="nav-item nav-item--active"'),
    'skills.html': ('/skills.html" class="nav-item"', '/skills.html" class="nav-item nav-item--active"'),
    'tool.html':   None # tool.html highlights dynamically via script.js highlightToolPageNav()
}

for filename, active_replace in targets.items():
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace existing aside with clean_sidebar
    new_content = re.sub(r'<aside class="sidebar" id="sidebar">.*?</aside>', clean_sidebar.replace('\\', '\\\\'), content, flags=re.DOTALL)
    
    if active_replace:
        # Inject active state
        new_content = new_content.replace(active_replace[0], active_replace[1], 1)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Updated {filename}")
