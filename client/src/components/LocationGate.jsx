import o,{useEffect as b,useState as r}from"react";import{useLocation as A}from"../context/LocationContext";import{getDeviceInfo as E}from"../utils/deviceInfo";import{MapPin as s,Loader2 as l,AlertTriangle as y,RefreshCw as h,Smartphone as C}from"lucide-react";import{buildApiPath as T}from"@/lib/networkConfig";const v="mhub_device_info_sent";function G({children:x}){const{loading:n,error:c,permissionGranted:a,permissionDenied:w,requestLocation:d,city:N,accuracy:g,provider:k}=A(),[p,m]=r(!1),[t,u]=r(!1),[z,S]=r(!1);b(()=>{const i=setTimeout(()=>{n&&!a&&(console.log("[LocationGate] Auto-bypassing after 5 seconds - app will load while GPS continues in background"),S(!0))},5e3);return()=>clearTimeout(i)},[n,a]),b(()=>{if(sessionStorage.getItem(v)==="1"){m(!0);return}p||(L(),m(!0))},[p]);const L=async()=>{try{const i=E();await fetch(T("/analytics/device"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(i)}),sessionStorage.setItem(v,"1"),console.log("[LocationGate] Device info sent:",i.fingerprint)}catch(i){console.error("[LocationGate] Failed to send device info:",i)}},f=async()=>{u(!0),await d(),u(!1)};return a&&!n||z?o.createElement(o.Fragment,null,x):n?o.createElement("div",{className:"location-gate"},o.createElement("div",{className:"location-gate-content"},o.createElement("div",{className:"location-gate-icon pulse"},o.createElement(s,{size:48})),o.createElement("h1",null,"Detecting Your Location"),o.createElement("p",null,"Using GPS for accurate location (up to 60 seconds)"),o.createElement("div",{className:"location-gate-loader"},o.createElement(l,{className:"spin",size:32})),o.createElement("p",{className:"location-gate-hint"},"App will load shortly even if detection takes time...")),o.createElement("style",null,e)):w?o.createElement("div",{className:"location-gate denied"},o.createElement("div",{className:"location-gate-content"},o.createElement("div",{className:"location-gate-icon warning"},o.createElement(y,{size:48})),o.createElement("h1",null,"Location Access Required"),o.createElement("p",null,"MHub needs your location to show nearby products and connect you with local sellers."),o.createElement("div",{className:"location-gate-instructions"},o.createElement("h3",null,o.createElement(C,{size:20})," How to Enable Location:"),o.createElement("ol",null,o.createElement("li",null,"Tap the ",o.createElement("strong",null,"\u{1F512} lock icon")," in your browser's address bar"),o.createElement("li",null,"Find ",o.createElement("strong",null,"Location")," setting"),o.createElement("li",null,"Change to ",o.createElement("strong",null,"Allow")),o.createElement("li",null,"Refresh this page"))),N&&o.createElement("div",{className:"location-gate-fallback"},o.createElement("p",null,"Current location source: ",o.createElement("strong",null,k||"unknown")),o.createElement("p",{className:"muted"},g?`Last known accuracy: \xB1${Math.round(g)}m`:"Enable GPS for the most accurate location.")),o.createElement("button",{className:"location-gate-btn",onClick:f,disabled:t},t?o.createElement(o.Fragment,null,o.createElement(l,{className:"spin",size:20})," Checking..."):o.createElement(o.Fragment,null,o.createElement(h,{size:20})," Try Again"))),o.createElement("style",null,e)):c?o.createElement("div",{className:"location-gate error"},o.createElement("div",{className:"location-gate-content"},o.createElement("div",{className:"location-gate-icon warning"},o.createElement(y,{size:48})),o.createElement("h1",null,"Location Error"),o.createElement("p",null,c),o.createElement("button",{className:"location-gate-btn",onClick:f,disabled:t},t?o.createElement(o.Fragment,null,o.createElement(l,{className:"spin",size:20})," Retrying..."):o.createElement(o.Fragment,null,o.createElement(h,{size:20})," Try Again"))),o.createElement("style",null,e)):o.createElement("div",{className:"location-gate"},o.createElement("div",{className:"location-gate-content"},o.createElement("div",{className:"location-gate-icon pulse"},o.createElement(s,{size:48})),o.createElement("h1",null,"Enable Location"),o.createElement("p",null,"Allow location access to discover products near you and connect with local sellers."),o.createElement("button",{className:"location-gate-btn primary",onClick:d},o.createElement(s,{size:20})," Allow Location Access"),o.createElement("p",{className:"location-gate-privacy"},"\u{1F512} Your location is stored securely and only used to improve your experience.")),o.createElement("style",null,e))}const e=`
  .location-gate {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  }
  .location-gate-content {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 40px;
    max-width: 420px;
    width: 100%;
    text-align: center;
    color: #fff;
  }
  .location-gate-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
  }
  .location-gate-icon.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
  .location-gate-icon.pulse {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  .location-gate h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: #fff;
  }
  .location-gate p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
    line-height: 1.6;
  }
  .location-gate-loader {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    color: #22c55e;
  }
  .location-gate-hint {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 16px;
    margin-bottom: 0;
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .location-gate-instructions {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: left;
  }
  .location-gate-instructions h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    margin-bottom: 12px;
    color: #fff;
  }
  .location-gate-instructions ol {
    margin: 0;
    padding-left: 20px;
    color: rgba(255, 255, 255, 0.7);
  }
  .location-gate-instructions li {
    margin-bottom: 8px;
  }
  .location-gate-fallback {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .location-gate-fallback p {
    margin-bottom: 8px;
    color: #22c55e;
  }
  .location-gate-fallback .muted {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0;
  }
  .location-gate-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .location-gate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
  }
  .location-gate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .location-gate-privacy {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 20px;
    margin-bottom: 0;
  }
`;export{G as default};
