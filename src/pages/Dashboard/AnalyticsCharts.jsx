import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
const PRIORITY_COLORS = {
  High: '#f43f5e',   // Rose-500
  Normal: '#f59e0b', // Amber-500
  Low: '#10b981'     // Emerald-500
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-4 rounded-[20px] shadow-2xl animate-in fade-in zoom-in duration-300 ring-1 ring-neutral-900/5">
        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((item, index) => (
            <p key={index} className="text-sm font-black text-neutral-950 flex items-center gap-2 tabular-nums tracking-tighter">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
              {item.value} <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{item.name || 'Volume'}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const TrendChart = ({ data }) => {
  const isEmpty = data.every(d => d.count === 0);

  if (isEmpty) {
    return (
      <div className="h-[320px] w-full flex flex-col items-center justify-center bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-neutral-300 shadow-sm mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
        </div>
        <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">No Activity Detected</p>
        <p className="text-[10px] font-bold text-neutral-400 uppercase mt-2 tracking-widest leading-none">Awaiting incoming patient data streams...</p>
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full rounded-3xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.1}/>
              <stop offset="100%" stopColor="#059669" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}
            dy={15}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }} />
          <Area 
            type="monotone" 
            dataKey="count" 
            name="Leads"
            stroke="#10b981" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorLeads)" 
            animationDuration={2000}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="none"
            fill="url(#colorPulse)" 
            animationDuration={2500}
            animationBegin={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DistributionPie = ({ data, title }) => (
  <div className="h-[280px] w-full relative rounded-3xl p-4">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={70}
          outerRadius={95}
          paddingAngle={10}
          dataKey="value"
          stroke="none"
          animationBegin={300}
          animationDuration={1500}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
       <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] leading-none mb-2">Total</p>
       <p className="text-3xl font-black text-neutral-950 leading-none tracking-tighter tabular-nums">
         {data.reduce((acc, curr) => acc + curr.value, 0)}
       </p>
    </div>
  </div>
);

export const ServiceBarChart = ({ data }) => (
  <div className="h-[280px] w-full rounded-3xl p-4">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900, width: 100 }}
          width={80}
        />
        <Tooltip 
          cursor={{ fill: 'rgba(0, 0, 0, 0.02)', radius: 12 }}
          content={<CustomTooltip />}
        />
        <Bar dataKey="value" name="Volume" radius={[0, 12, 12, 0]} barSize={16} animationDuration={1200}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

