# ⚠️ Backend Restart Required

## 🚨 Why are the dropdowns empty?
The **Country** and **State** dropdowns are empty because the **System Database Table (`CountryStateMaster`)** responsible for providing this list was missing or empty.

## ✅ The Fix
I have updated the backend code (`Program.cs`) to **automatically create and populate** this table with existing default data (India + States) when the server starts.

## ⚡ Action Required
You **MUST RESTART the Backend Server** for these changes to take effect.
1. Stop the currently running backend console/terminal.
2. Run the backend again (e.g., `dotnet watch run` or your start command).

Once restarted:
1. Reload the frontend page (`Ctrl + Shift + R`).
2. The dropdowns will now be populated with "India" and its states.
