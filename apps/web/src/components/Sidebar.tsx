import {
    Activity,
    BarChart3,
    CircleDollarSign,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    WalletCards,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";


const navigation = [
    {
        label: "Overview",
        icon: LayoutDashboard,
        path: "/",
    },
    {
        label: "Recovery Cases",
        icon: WalletCards,
        path: "/cases",
    },
    {
        label: "Revenue",
        icon: BarChart3,
        path: "/revenue",
    },
    {
        label: "Batch Recovery",
        icon: Activity,
        path: "/batch",
    },
    {
        label: "Policy",
        icon: ShieldCheck,
        path: "/policy",
    },
];

export function Sidebar() {
    const location = useLocation();
    return (
        <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-black/20 lg:flex lg:flex-col">
            <div className="flex h-18 items-center border-b border-white/8 px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
                        <CircleDollarSign size={18} />
                    </div>

                    <div>
                        <div className="text-sm font-semibold tracking-tight text-white">
                            RecoverAI
                        </div>

                        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            Revenue Recovery
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-5">
                {navigation.map((item) => {
                    const Icon = item.icon;

                    const active =
                        location.pathname === item.path;

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={[
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                                active
                                    ? "bg-white/8 text-white"
                                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200",
                            ].join(" ")}
                        >
                            <Icon
                                size={17}
                                strokeWidth={1.7}
                            />

                            <span>{item.label}</span>

                            {active && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/8 p-4">
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                        <span className="text-xs font-medium text-zinc-200">
                            Recovery Engine
                        </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-zinc-500">
                        Autonomous recovery infrastructure is operational.
                    </p>
                </div>
            </div>
        </aside>
    );
}