import Link from 'next/link';
export default function NotFound(){return <div style={{display:'grid',placeItems:'center',minHeight:'60vh',textAlign:'center'}}><div><div className="eyebrow">PAGE NOT FOUND</div><h1>404 — This chart has no data.</h1><p style={{color:'#93a5a5',marginBottom:22}}>ไม่พบหน้าที่คุณต้องการ</p><Link className="btn btn-primary" href="/">Back to dashboard</Link></div></div>}
