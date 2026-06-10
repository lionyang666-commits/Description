Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c py app.py", 1, False
WScript.Sleep 3000
WshShell.Run "http://localhost:8888", 1, False
