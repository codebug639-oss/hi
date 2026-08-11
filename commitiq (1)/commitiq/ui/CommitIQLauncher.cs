using System;
using System.Diagnostics;
using System.IO;

namespace CommitIQLauncher
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string repoPath = Directory.GetCurrentDirectory();

            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].StartsWith("--repo="))
                {
                    repoPath = args[i].Substring(7);
                }
                else if (Directory.Exists(args[i]))
                {
                    repoPath = args[i];
                }
            }

            string uiDir = Path.GetFullPath(Path.Combine(exeDir, ".."));
            if (!File.Exists(Path.Combine(uiDir, "package.json")))
            {
                string homeDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                uiDir = Path.Combine(homeDir, ".commitiq", "ui");
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";
            psi.Arguments = string.Format("/c npx electron \"{0}\" --repo=\"{1}\"", uiDir, repoPath);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;

            try
            {
                Process.Start(psi);
            }
            catch (Exception)
            {
            }
        }
    }
}
