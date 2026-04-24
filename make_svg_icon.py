import base64
from PIL import Image
import io

img = Image.open("public/MUJinny-Logo.png").convert("RGBA")
img = img.resize((200, 200), Image.LANCZOS)

buf = io.BytesIO()
img.save(buf, format="PNG")
b64 = base64.b64encode(buf.getvalue()).decode()

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <clipPath id="circle">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <circle cx="50" cy="50" r="50" fill="#1d2b6b"/>
  <image href="data:image/png;base64,{b64}" x="10" y="10" width="80" height="80" clip-path="url(#circle)"/>
</svg>'''

with open("src/app/icon.svg", "w") as f:
    f.write(svg)

print("SVG icon created.")
