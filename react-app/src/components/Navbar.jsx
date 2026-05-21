import { useState } from "react";
import {
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Menu,
    Badge
} from "@mui/material";
import { MapPin, Search, Bell, Moon, Sun } from "lucide-react";

import { useLocation } from "../LocationContext";
import { useTheme } from "../ThemeContext";

const locations = [
    "Pune",
    "Mumbai",
    "Ahmedabad",
    "Coimbatore",
    "Hyderabad",
    "Bangalore Domlur office",
    "Bangalore Signet",
    "Chennai",
];

export function Navbar() {
    const { location, setLocation } = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [notifAnchor, setNotifAnchor] = useState(null);

    return (

        <nav className={`h-16 flex items-center justify-between px-8 border-b sticky top-0 z-30 ${theme === "dark" 
          ? "bg-[#020817] text-gray-200 border-gray-800" 
          : "bg-white text-gray-900 border-gray-200"}`}>


            {/* LEFT */}
            <div className="flex items-center gap-6 flex-1">

                {/* Location */}
                <div className="flex items-center gap-2 min-w-[180px]">
                    <MapPin size={18} className="text-indigo-400" />

                    <FormControl size="small" fullWidth>
                        <Select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            sx={{
                                color: theme === "dark" ? "white" : "black",
                                borderRadius: "999px",
                                backgroundColor: theme === "dark" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.05)",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme === "dark" ? "rgba(100,116,139,0.2)" : "rgba(100,116,139,0.3)"
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: theme === "dark" ? "rgba(100,116,139,0.4)" : "rgba(100,116,139,0.5)"
                                }
                            }}
                        >
                            {locations.map((loc) => (
                                <MenuItem key={loc} value={loc}>
                                    {loc}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3">

                {/* Theme Toggle */}
                <Button 
                    onClick={toggleTheme}
                    sx={{ minWidth: 0, color: theme === "dark" ? "white" : "black" }}
                    title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                >
                    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </Button>

                {/* Notification */}
                <Button 
                    onClick={(e) => setNotifAnchor(e.currentTarget)} 
                    sx={{ minWidth: 0, color: theme === "dark" ? "white" : "black" }}
                >
                    <Badge color="error" variant="dot" invisible={Boolean(notifAnchor)}>
                        <Bell size={18} />
                    </Badge>
                </Button>

                {/* Notification Menu */}
                <Menu
                    anchorEl={notifAnchor}
                    open={Boolean(notifAnchor)}
                    onClose={() => setNotifAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                        sx: {
                            mt: 1.5,
                            bgcolor: theme === 'dark' ? '#0f1420' : '#ffffff',
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            border: '1px solid',
                            borderColor: theme === 'dark' ? '#1e2a45' : '#e2e8f0',
                            borderRadius: '1rem',
                            minWidth: '280px',
                            boxShadow: theme === 'dark' ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }
                    }}
                >
                    <div className={`px-4 py-3 border-b text-sm font-bold ${theme === 'dark' ? 'border-[#1e2a45]' : 'border-gray-100'}`}>
                        Notifications
                    </div>
                    <MenuItem onClick={() => setNotifAnchor(null)} sx={{ fontSize: '0.8rem', py: 1.5 }}>
                        <span className="mr-2">👋</span> Welcome to Apexon RoomBook!
                    </MenuItem>
                    <MenuItem onClick={() => setNotifAnchor(null)} sx={{ fontSize: '0.8rem', py: 1.5 }}>
                        <span className="mr-2">✅</span> Your booking was confirmed.
                    </MenuItem>
                    <MenuItem onClick={() => setNotifAnchor(null)} sx={{ fontSize: '0.8rem', py: 1.5 }}>
                        <span className="mr-2">🚀</span> Explore the new Dashboard features.
                    </MenuItem>
                </Menu>

            </div>
        </nav>
    );
}