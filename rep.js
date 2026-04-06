const fs = require('fs');
const path = 'c:\\login-router\\login page\\src\\components\\todo\\TodoWorkspace.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `              {activeMode === "dashboard" && (() => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
                const monthTasksCount = todos.filter(t => t.done && t.completedAt && t.completedAt > thirtyDaysAgo.getTime()).length;
                const createdThisMonth = todos.filter(t => t.createdAt > thirtyDaysAgo.getTime()).length;
                const monthCompletionPct = createdThisMonth > 0 ? Math.round((monthTasksCount / createdThisMonth) * 100) : (todos.length === 0 ? 0 : 100);

                const lifetimeTasksCompleted = stats.completed;
                const lifetimeProjects = Array.from(new Set(todos.map(t => t.project).filter(Boolean))).length;
                
                const activeDaysSet = new Set();
                todos.forEach(t => {
                   if (t.done && t.completedAt) {
                      activeDaysSet.add(new Date(t.completedAt).toDateString());
                   } else {
                      activeDaysSet.add(new Date(t.createdAt).toDateString());
                   }
                });
                const totalActiveDays = activeDaysSet.size;

                const careerLevel = Math.floor(lifetimeTasksCompleted / 10) + 1;
                const tasksToNextLevel = 10 - (lifetimeTasksCompleted % 10);
                const levelProgress = ((10 - tasksToNextLevel) / 10) * 100;

                const workTasks = todos.filter(t => t.category.toLowerCase().includes("work")).length || 1;
                const learnTasks = todos.filter(t => t.category.toLowerCase().includes("learn")).length || 1;
                const lifeTasks = todos.filter(t => !t.category.toLowerCase().includes("work") && !t.category.toLowerCase().includes("learn")).length || 1;
                const totalCats = workTasks + learnTasks + lifeTasks;

                const workPct = Math.round((workTasks/totalCats)*100);
                const learnPct = Math.round((learnTasks/totalCats)*100);
                const lifePct = 100 - workPct - learnPct;

                return (
                 <SectionCard title="Career Dashboard" subtitle="Track your long-term productivity and career growth.">
                  <style dangerouslySetInnerHTML={{__html: \\\`
                    .premium-career-dashboard {
                      --dash-glass: rgba(20, 25, 35, 0.4);
                      --dash-border: rgba(255, 255, 255, 0.05);
                      --dash-card-bg: linear-gradient(145deg, rgba(25, 30, 42, 0.6), rgba(15, 20, 28, 0.8));
                      --dash-accent: #0ea5e9;
                      --dash-accent-glow: rgba(14, 165, 233, 0.3);
                      --dash-success: #10b981;
                      --dash-warning: #f59e0b;
                      --dash-purple: #8b5cf6;
                      color: #e2e8f0;
                      display: flex;
                      flex-direction: column;
                      gap: 24px;
                      animation: dashFadeIn 0.8s ease-out forwards;
                    }
                    @keyframes dashFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .premium-career-dashboard * { box-sizing: border-box; }
                    .dash-card {
                      background: var(--dash-card-bg);
                      border: 1px solid var(--dash-border);
                      border-radius: 20px;
                      padding: 24px;
                      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                      backdrop-filter: blur(12px);
                      transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
                      position: relative;
                      overflow: hidden;
                      display: flex; 
                      flex-direction: column;
                    }
                    .dash-card::before {
                      content: '';
                      position: absolute;
                      top: 0; left: 0; right: 0; height: 1px;
                      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                    }
                    .dash-card:hover {
                      transform: translateY(-4px);
                      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
                      border-color: rgba(255,255,255,0.1);
                    }
                    .dash-title {
                      font-size: 1rem;
                      color: #cbd5e1;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      margin: 0 0 20px 0;
                      font-family: inherit;
                      font-weight: 600;
                      display: flex;
                      align-items: center;
                      gap: 10px;
                    }
                    .dash-title i { color: var(--dash-accent); font-size: 1.1rem; }
                    .dash-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                    .dash-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                    .dash-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
                    
                    .metric-large {
                      font-size: 3rem;
                      font-weight: 700;
                      color: #fff;
                      margin: 0;
                      line-height: 1;
                      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    }
                    .metric-sub { font-size: 0.95rem; color: #94a3b8; margin-top: 8px; margin-bottom: 0; }
                    .trend-up { color: var(--dash-success); background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 8px; font-weight: 500;}
                    .dash-progress-wrap { margin-top: auto; padding-top: 24px;}
                    .dash-progress-track {
                      background: rgba(255,255,255,0.06);
                      height: 10px;
                      border-radius: 5px;
                      overflow: hidden;
                      margin-bottom: 8px;
                      box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
                    }
                    .dash-progress-fill {
                      height: 100%;
                      background: linear-gradient(90deg, var(--dash-accent), var(--dash-purple));
                      border-radius: 5px;
                      box-shadow: 0 0 12px var(--dash-accent-glow);
                      transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .dash-level-header {
                      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
                    }
                    .dash-level-header strong { font-size: 1.1rem; color: #fff;}
                    .dash-badge {
                      background: rgba(139, 92, 246, 0.15);
                      color: #ddd6fe;
                      padding: 6px 14px;
                      border-radius: 12px;
                      font-size: 0.85rem;
                      border: 1px solid rgba(139, 92, 246, 0.3);
                      display: inline-flex; align-items: center; gap: 6px;
                    }
                    .dash-heatmap {
                      display: grid;
                      grid-template-columns: repeat(7, 1fr);
                      gap: 8px;
                      margin-top: auto;
                    }
                    .heat-cell {
                      aspect-ratio: 1;
                      border-radius: 6px;
                      background: rgba(255,255,255,0.04);
                      transition: all 0.2s ease;
                      position: relative;
                    }
                    .heat-cell:hover { transform: scale(1.15); z-index: 2; box-shadow: 0 0 12px rgba(16,185,129,0.4); }
                    .heat-cell[data-level="1"] { background: rgba(16, 185, 129, 0.2); }
                    .heat-cell[data-level="2"] { background: rgba(16, 185, 129, 0.5); }
                    .heat-cell[data-level="3"] { background: rgba(16, 185, 129, 0.8); }
                    .heat-cell[data-level="4"] { background: rgba(16, 185, 129, 1); box-shadow: 0 0 8px rgba(16,185,129,0.5); }
                    .dash-feed { display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
                    .dash-feed-item {
                      display: flex; gap: 16px; align-items: center;
                      padding: 14px; background: rgba(0,0,0,0.15); border-radius: 16px;
                      border: 1px solid rgba(255,255,255,0.02);
                      transition: background 0.2s;
                    }
                    .dash-feed-item:hover { background: rgba(255,255,255,0.04); }
                    .feed-icon { 
                      width: 40px; height: 40px; border-radius: 50%;flex-shrink:0;
                      display: flex; align-items: center; justify-content: center;
                      background: rgba(14, 165, 233, 0.15); color: var(--dash-accent);
                      font-size: 1.2rem;
                    }
                    .feed-icon.completed { background: rgba(16,185,129,0.15); color: var(--dash-success); }
                    .feed-content { flex: 1; min-width: 0; }
                    .feed-content h5 { margin: 0 0 4px; font-size: 0.95rem; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;}
                    .feed-content p { margin: 0; font-size: 0.8rem; color: #94a3b8; }
                    .dash-task-list { display: flex; flex-direction: column; gap: 10px; }
                    .dash-task-row {
                      display: flex; align-items: center; justify-content: space-between;
                      padding: 14px 16px; background: rgba(255,255,255,0.02); border-radius: 12px;
                      border: 1px solid transparent; transition: all 0.2s;
                    }
                    .dash-task-row:hover { border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); transform: translateX(4px); }
                    .dash-chart-container { position:relative; display: flex; flex-direction: column; align-items: center;}
                    .dash-pie {
                      width: 140px; height: 140px; border-radius: 50%;
                      background: conic-gradient(
                         var(--dash-accent) 0% \\\${workPct}%, 
                         var(--dash-purple) \\\${workPct}% \\\${workPct + learnPct}%, 
                         var(--dash-warning) \\\${workPct + learnPct}% 100%
                      );
                      margin: 0 auto;
                      position: relative;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                      animation: pieReveal 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    }
                    @keyframes pieReveal { from { transform: scale(0.5) rotate(-90deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; }}
                    .dash-pie::after {
                      content: ''; position: absolute; inset: 25px; background: var(--dash-card-bg); border-radius: 50%;
                      box-shadow: inset 0 4px 10px rgba(0,0,0,0.4);
                    }
                    .pie-legend { display: flex; justify-content: center; gap: 20px; margin-top: 24px; width: 100%;}
                    .pie-legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #cbd5e1;}
                    .pie-dot { width: 12px; height: 12px; border-radius: 50%; }
                    .mini-bar-chart {
                      display: flex; align-items: flex-end; gap: 6px; height: 70px; margin-top: 30px;
                    }
                    .mini-bar {
                      flex: 1;
                      background: linear-gradient(to top, var(--dash-accent), rgba(14, 165, 233, 0.1));
                      border-radius: 4px 4px 0 0;
                      opacity: 0.9;
                      transition: height 1s ease-out, filter 0.2s;
                    }
                    .mini-bar:hover { filter: brightness(1.3); }
                    @media(max-width: 1200px) {
                       .dash-split { grid-template-columns: 1fr; }
                       .dash-grid-3 { grid-template-columns: 1fr; }
                       .dash-grid-2 { grid-template-columns: 1fr; }
                    }
                  \\\`}} />
                  <div className="premium-career-dashboard">
                    
                    <div className="dash-grid-2">
                       <div className="dash-card">
                          <h3 className="dash-title"><i className="bi bi-graph-up-arrow"></i> Monthly Progress (Last 30 Days)</h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                               <p className="metric-large">{monthTasksCount}</p>
                               <p className="metric-sub">Tasks completed</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <p className="metric-large" style={{ color: 'var(--dash-accent)'}}>{monthCompletionPct}%</p>
                               <p className="metric-sub">Completion Rate</p>
                            </div>
                          </div>
                          <div className="mini-bar-chart">
                             {Array.from({length: 14}).map((_, i) => (
                               <div key={i} className="mini-bar" style={{
                                 height: \\\`\\\${20 + Math.random() * 80}%\\\`
                               }} title="Daily Activity"></div>
                             ))}
                          </div>
                          <p className="metric-sub" style={{ marginTop: '20px' }}>
                             <span className="trend-up"><i className="bi bi-arrow-up-short"></i> 12%</span> vs last month
                          </p>
                       </div>

                       <div className="dash-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(25, 30, 42, 0.6) 100%)' }}>
                          <h3 className="dash-title"><i className="bi bi-trophy"></i> Lifetime Career Progress</h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                               <p className="metric-large">{lifetimeTasksCompleted}</p>
                               <p className="metric-sub">All-time completions</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                               <p className="metric-large">{totalActiveDays}</p>
                               <p className="metric-sub">Active Days</p>
                            </div>
                          </div>
                          
                          <div className="dash-progress-wrap">
                             <div className="dash-level-header">
                                <strong>Level {careerLevel} Creator</strong>
                                <span className="dash-badge"><i className="bi bi-star-fill"></i> {tasksToNextLevel} tasks to Level {careerLevel + 1}</span>
                             </div>
                             <div className="dash-progress-track">
                                <div className="dash-progress-fill" style={{ width: \\\`\\\${levelProgress}%\\\` }}></div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="dash-grid-3">
                       <div className="dash-card">
                         <h3 className="dash-title"><i className="bi bi-calendar3"></i> Weekly Activity Heatmap</h3>
                         <div className="dash-heatmap">
                           {Array.from({length: 28}).map((_, i) => {
                             const level = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
                             return <div key={i} className="heat-cell" data-level={level} title={\\\`\\\${level} tasks\\\`}></div>
                           })}
                         </div>
                       </div>
                       
                       <div className="dash-card" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                         <h3 className="dash-title" style={{ alignSelf: 'flex-start', margin: 0 }}><i className="bi bi-fire"></i> Task Consistency</h3>
                         <div style={{ marginTop: 'auto', marginBottom: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25), transparent 70%)', borderRadius: '50%' }}>
                              <i className="bi bi-fire" style={{ fontSize: '3.5rem', color: 'var(--dash-warning)', filter: 'drop-shadow(0 0 15px rgba(245,158,11,0.6))', animation: 'pulse 2s infinite' }}></i>
                            </div>
                            <h4 style={{ fontSize: '2rem', margin: '16px 0 4px', color: '#fff', fontWeight: '700' }}>5 Day Streak</h4>
                            <p className="metric-sub">Longest streak: 14 days</p>
                         </div>
                       </div>

                       <div className="dash-card">
                         <h3 className="dash-title" style={{ marginBottom: 0 }}><i className="bi bi-pie-chart"></i> Time Distribution</h3>
                         <div className="dash-chart-container" style={{ flex: 1, justifyContent: 'center' }}>
                            <div className="dash-pie"></div>
                            <div className="pie-legend">
                              <div className="pie-legend-item"><div className="pie-dot" style={{background: 'var(--dash-accent)'}}></div> Work <span style={{color: '#fff'}}>{workPct}%</span></div>
                              <div className="pie-legend-item"><div className="pie-dot" style={{background: 'var(--dash-purple)'}}></div> Learn <span style={{color: '#fff'}}>{learnPct}%</span></div>
                              <div className="pie-legend-item"><div className="pie-dot" style={{background: 'var(--dash-warning)'}}></div> Life <span style={{color: '#fff'}}>{lifePct}%</span></div>
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="dash-split">
                       <div className="dash-card">
                          <h3 className="dash-title"><i className="bi bi-activity"></i> Recent Activity Feed</h3>
                          <div className="dash-feed">
                            {todos.slice(0, 5).map(t => (
                               <div key={t.id} className="dash-feed-item">
                                 <div className={\\\`feed-icon \\\${t.done ? 'completed' : ''}\\\`}>
                                   <i className={\\\`bi \\\${t.done ? 'bi-check2-all' : 'bi-plus-lg'}\\\`}></i>
                                 </div>
                                 <div className="feed-content">
                                   <h5>{t.title}</h5>
                                   <p>{t.done ? 'Completed task' : 'Created task'} • {new Date(t.createdAt).toLocaleDateString()}</p>
                                 </div>
                               </div>
                            ))}
                          </div>
                       </div>

                       <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                         <div className="dash-card" style={{ flex: 1 }}>
                            <h3 className="dash-title"><i className="bi bi-star"></i> Today's Focus</h3>
                            <div className="dash-task-list">
                               {todos.filter(t => !t.done).slice(0, 3).map(t => (
                                 <div key={t.id} className="dash-task-row">
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                                        background: t.priority === 'High' ? '#f43f5e' : t.priority === 'Medium' ? '#f59e0b' : '#0ea5e9' }}></div>
                                      <span style={{ fontSize: '0.95rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                                   </div>
                                 </div>
                               ))}
                               {todos.filter(t => !t.done).length === 0 && (
                                 <p className="metric-sub" style={{ textAlign: 'center', margin: '20px 0' }}>No pending tasks!</p>
                               )}
                            </div>
                         </div>
                         
                         <div className="dash-card" style={{ flex: 1 }}>
                            <h3 className="dash-title"><i className="bi bi-clock-history"></i> Performance Summary</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                              <div>
                                <strong style={{ color: 'var(--dash-success)', fontSize: '2rem', lineHeight: '1' }}>{stats.completionPct}%</strong>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginTop: '4px' }}>Efficiency</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ color: '#fff', fontSize: '1.2rem'}}>{stats.completed}</strong> <span style={{ color: '#94a3b8' }}>done</span>
                                <br/>
                                <strong style={{ color: '#fff', fontSize: '1.2rem'}}>{stats.pending}</strong> <span style={{ color: '#94a3b8' }}>pending</span>
                              </div>
                            </div>
                            <div className="dash-progress-track" style={{ marginTop: 'auto' }}>
                                <div className="dash-progress-fill" style={{ width: \\\`\\\${stats.completionPct}%\\\`, background: 'linear-gradient(90deg, #10b981, #34d399)', boxShadow: '0 0 12px rgba(16,185,129,0.4)' }}></div>
                             </div>
                         </div>
                       </div>
                    </div>

                  </div>
                 </SectionCard>
                );
              })()}`;

const regex = /\{activeMode === "dashboard" && \(\s*<SectionCard[\s\S]*?<\/SectionCard>\s*\)\}/;
if(regex.test(content)) {
    const nextContent = content.replace(regex, replacement);
    fs.writeFileSync(path, nextContent, 'utf8');
    console.log("Success using regex");
} else {
    console.log("Error not found using regex!");
}
