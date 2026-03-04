import e from"react";import{useNavigate as m}from"react-router-dom";import{ArrowLeft as n}from"lucide-react";import{Button as b}from"@/components/ui/button";const x=({title:a,showBack:s=!0,backTo:r,rightAction:l,className:i="",transparent:t=!1})=>{const o=m(),d=()=>{o(r||-1)};return e.createElement("div",{className:`
      sticky top-0 z-50 w-full px-4 py-3 flex items-center justify-between
      transition-all duration-300
      ${t?"bg-transparent text-white":"bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm"}
      ${i}
    `},e.createElement("div",{className:"flex items-center gap-3 flex-1"},s&&e.createElement(b,{onClick:d,variant:"ghost",size:"icon",className:`
              rounded-full p-2 transition-all duration-200
              ${t?"bg-black/20 hover:bg-black/40 text-white":"hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"}
            `,"aria-label":"Go back"},e.createElement(n,{className:"w-5 h-5 md:w-6 md:h-6"})),a&&e.createElement("h1",{className:`
            font-bold text-lg md:text-xl truncate
            ${t?"text-white drop-shadow-md":"text-slate-900 dark:text-white"}
          `},a)),l&&e.createElement("div",{className:"flex items-center gap-2 pl-2"},l))};var u=x;export{u as default};
