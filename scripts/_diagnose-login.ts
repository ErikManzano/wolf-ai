const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(/\/+$/, '');

async function tryLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  console.log(`\n${email} → ${res.status}`);
  console.log(text.slice(0, 500));
}

async function main() {
  console.log('API:', API_BASE);
  const health = await fetch(`${API_BASE}/health`);
  console.log('health', health.status, (await health.text()).slice(0, 200));
  const users = await fetch(`${API_BASE}/users`);
  const usersText = await users.text();
  console.log('users', users.status, usersText.length, 'chars');
  try {
    const parsed = JSON.parse(usersText) as Array<{ id: string; username?: string; email?: string }>;
    console.log(
      'user ids:',
      parsed.map((u) => `${u.id}${u.username ? ` (${u.username})` : ''}`).join(', '),
    );
  } catch {
    console.log(usersText.slice(0, 300));
  }
  await tryLogin('coach-wl', 'CoachWL2026!');
  await tryLogin('erik', 'ErikWL2026!');
  await tryLogin('coach@wolf-ai.app', 'WolfCoach_7kM9pX2wLq');
  await tryLogin('atleta@wolf-ai.app', 'WolfAtleta_4nR8tY5wZx');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
