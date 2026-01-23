const fs = require('fs');
const path = require('path');

// middleware/auth.ts
const authPath = path.join(__dirname, '..', 'server', 'middleware', 'auth.ts');
let authContent = fs.readFileSync(authPath, 'utf8');

const oldPattern = `      site?: string | null;
    };
  }
}`;

const newPattern = `      site?: string | null;
      sites?: string[];
    };
  }
}`;

if (authContent.includes('sites?: string[]')) {
  console.log('middleware/auth.ts: 이미 수정됨');
} else if (authContent.includes(oldPattern)) {
  authContent = authContent.replace(oldPattern, newPattern);
  fs.writeFileSync(authPath, authContent, 'utf8');
  console.log('middleware/auth.ts: 수정 완료');
} else {
  console.log('middleware/auth.ts: 패턴 없음');
}

// routes.ts
const routesPath = path.join(__dirname, '..', 'server', 'routes.ts');
let routesContent = fs.readFileSync(routesPath, 'utf8');

if (routesContent.includes('sites?: string[]')) {
  console.log('routes.ts: 이미 수정됨');
} else if (routesContent.includes(oldPattern)) {
  routesContent = routesContent.replace(oldPattern, newPattern);
  fs.writeFileSync(routesPath, routesContent, 'utf8');
  console.log('routes.ts: 수정 완료');
} else {
  console.log('routes.ts: 패턴 없음');
}
