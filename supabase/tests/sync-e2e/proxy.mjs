// Supabase-shaped front for PostgREST: /rest/v1/* → PostgREST, /admin/users → insert into auth.users.
import { execFileSync } from 'node:child_process';
import http from 'node:http';

const [, , port, pgrst, psqlArgs] = process.argv;
http
  .createServer((req, res) => {
    if (req.url === '/admin/users' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const { id } = JSON.parse(body);
        if (!/^[0-9a-f-]{36}$/.test(id)) return res.writeHead(400).end();
        execFileSync('sh', ['-c', `psql ${psqlArgs} -c "insert into auth.users (id) values ('${id}')"`]);
        res.writeHead(201).end();
      });
      return;
    }
    const target = new URL(req.url.replace(/^\/rest\/v1/, ''), pgrst);
    const upstream = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    });
    req.pipe(upstream);
  })
  .listen(Number(port));
