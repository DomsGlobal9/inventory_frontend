const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'PlatformAdminsPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldGridStr = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>`;
const gridStartIndex = content.indexOf(oldGridStr);

if (gridStartIndex !== -1) {
    const replacement = `<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {admins.map((admin) => (
            <div key={admin.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Left Status Border Indicator */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: admin.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-muted)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '250px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--bg-input) 0%, var(--bg-dark) 100%)',
                  border: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0
                }}>
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {admin.name}
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {admin.email}
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0, width: '120px', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '.05em',
                  background: admin.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(136, 136, 136, 0.1)',
                  color: admin.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-muted)'
                }}>
                  <ShieldCheck size={12} />
                  {admin.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                <button className="btn-secondary" disabled={reset.isPending}
                  onClick={() => issueNewPassword(admin)}
                  title="Issue a new password and email it"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 16px', minHeight: '40px' }}>
                  <KeyRound size={16} /> Reset Pass
                </button>

                {admin.status === 'ACTIVE' ? (
                  <button className="btn-secondary" disabled={setStatus.isPending || activeCount <= 1}
                    title={activeCount <= 1 ? 'This is the only active admin' : 'Deactivate'}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'INACTIVE' })}
                    style={{ fontSize: '13px', padding: '8px 16px', minHeight: '40px', color: activeCount <= 1 ? 'var(--text-muted)' : 'var(--accent-warning)', minWidth: '110px' }}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn-secondary" disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: admin.id, status: 'ACTIVE' })}
                    style={{ fontSize: '13px', padding: '8px 16px', minHeight: '40px', color: 'var(--accent-success)', minWidth: '110px' }}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>`;

    // replace from oldGridStr to the end of the admins.map loop
    // I know the admins.map loop ends right before the ")} </div>" at the end of the file
    // Let's find the closing tags of the grid container
    const newFileContent = content.slice(0, gridStartIndex) + replacement + "\n      )}\n    </div>\n  );\n}\n";
    
    fs.writeFileSync(filePath, newFileContent, 'utf8');
    console.log("Successfully converted to horizontal layout");
} else {
    console.log("Could not find grid container");
}
