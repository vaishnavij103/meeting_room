import {
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
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

                {/* Search */}
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`} />
                    <TextField
                        size="small"
                        placeholder="Search rooms..."
                        fullWidth
                        InputProps={{
                            style: {
                                paddingLeft: 36,
                                borderRadius: 999,
                                backgroundColor: theme === "dark" ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.05)",
                                color: theme === "dark" ? "white" : "black",
                            },
                        }}
                    />
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
                <Button sx={{ minWidth: 0, color: theme === "dark" ? "white" : "black" }}>
                    <Bell size={18} />
                </Button>

            </div>
        </nav>
    );
}