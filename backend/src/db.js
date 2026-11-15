// mysql2 is a client only. Nothing in this application creates a database or tables.
export function parseDatabaseUrl(value) {
  if (!value) throw new Error('DATABASE_URL is not set');
  const url=new URL(value);
  if(url.protocol!=='mysql:' || !url.hostname || url.pathname.length<2) throw new Error('DATABASE_URL must be mysql://user:pass@host:port/database');
  return {
    host:url.hostname, port:Number(url.port||3306), user:decodeURIComponent(url.username),
    password:decodeURIComponent(url.password), database:decodeURIComponent(url.pathname.slice(1)),
    waitForConnections:true, connectionLimit:5, queueLimit:100, connectTimeout:3000,
    supportBigNumbers:true, bigNumberStrings:true, multipleStatements:false,
  };
}

export function createDatabase(databaseUrl,{ssl=false,loadDriver=()=>import('mysql2/promise')}={}) {
  let pool;
  let pending;
  async function getPool(){
    if(pool)return pool;
    if(!pending)pending=(async()=>{const config=parseDatabaseUrl(databaseUrl);if(ssl)config.ssl={minVersion:'TLSv1.2',rejectUnauthorized:true};const driver=await loadDriver();pool=driver.createPool(config);return pool;})().finally(()=>{pending=null;});
    return pending;
  }
  return {
    async health(){try{await (await getPool()).query('SELECT 1');return true;}catch{return false;}},
    async execute(sql,args=[]){return (await getPool()).execute(sql,args);},
    async close(){if(pool)await pool.end();},
  };
}
