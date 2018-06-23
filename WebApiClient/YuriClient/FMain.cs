using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using YuriClient.Properties;

namespace YuriClient
{
    enum KEYMODIFIERS
    {
        ALT = 512,
        CONTROL = 1024,
        SHIFT = 2048,
        WINKEY = 4096
    }
    

    public partial class FMain : Form
    {
        private const string VERSION = "0.2.0";
        private Requests requests;
        private Dictionary<int, string> keysets = new Dictionary<int, string>();
        private Dictionary<string, string> guilds = new Dictionary<string, string>();


        class KeyConfig
        {
            public bool strg = false;
            public bool alt = false;
            public bool shift = false;
            public bool win = false;
            public int keycode;
            public int modifiers = 0;
            public Keys key;

            public KeyConfig(int keycode)
            {
                int sub = 0;
                this.keycode = keycode;

                if ((keycode & (int)KEYMODIFIERS.ALT) != 0)
                {
                    this.alt = true;
                    this.modifiers |= (int)KEYMODIFIERS.ALT;
                    sub += (int)KEYMODIFIERS.ALT;
                }
                if ((keycode & (int)KEYMODIFIERS.CONTROL) != 0)
                {
                    this.strg = true;
                    this.modifiers |= (int)KEYMODIFIERS.CONTROL;
                    sub += (int)KEYMODIFIERS.CONTROL;
                }
                if ((keycode & (int)KEYMODIFIERS.SHIFT) != 0)
                {
                    this.shift = true;
                    this.modifiers |= (int)KEYMODIFIERS.SHIFT;
                    sub += (int)KEYMODIFIERS.SHIFT;
                }
                if ((keycode & (int)KEYMODIFIERS.WINKEY) != 0)
                {
                    this.win = true;
                    this.modifiers |= (int)KEYMODIFIERS.WINKEY;
                    sub += (int)KEYMODIFIERS.WINKEY;
                }

                modifiers >>= 9;
                this.key = (Keys)(keycode - sub);
            }

            public string ToString(string additions)
            {
                string res = "";
                res = this.strg ? res + "STRG + " : res;
                res = this.alt ? res + "ALT + " : res;
                res = this.shift ? res + "SHIFT + " : res;
                res = this.win ? res + "WIN + " : res;
                res += Enum.GetName(typeof(Keys), this.key);
                res += " (" + keycode + ")";
                res += " " + additions;
                return res;
            }

            public static int GetOnlyKey(int keycode)
            {
                int sub = 0;
                if ((keycode & (int)KEYMODIFIERS.ALT) != 0)
                    sub += (int)KEYMODIFIERS.ALT;
                
                if ((keycode & (int)KEYMODIFIERS.CONTROL) != 0)
                    sub += (int)KEYMODIFIERS.CONTROL;
                
                if ((keycode & (int)KEYMODIFIERS.SHIFT) != 0)
                    sub += (int)KEYMODIFIERS.SHIFT;
                
                if ((keycode & (int)KEYMODIFIERS.WINKEY) != 0)
                    sub += (int)KEYMODIFIERS.WINKEY;

                return keycode - sub;
            }
        }


        public FMain()
        {
            InitializeComponent();
            this.Text = "Yuri WebAPIClient v." + VERSION;
            //Settings.Default.RegisteredKeys = "";
            //Settings.Default.Save();
        }


        private void Form1_Load(object sender, EventArgs e)
        {
            LoadKeyList();

            tbToken.Text = Settings.Default.Token?.ToString();

           // RegisterHotKey(this.Handle, 0, (int)KeyModifier.Control, Keys.NumPad0.GetHashCode());
           // RegisterHotKey(this.Handle, 1, (int)KeyModifier.Control | (int)KeyModifier.Alt, Keys.NumPad1.GetHashCode());
        }

        // SRC: https://www.fluxbytes.com/csharp/how-to-register-a-global-hotkey-for-your-application-in-c/
        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            if (m.Msg == 0x0312)
            {
                Keys key = (Keys)(((int)m.LParam >> 16) & 0xFFFF);                  // The key of the hotkey that was pressed.
                KEYMODIFIERS modifier = (KEYMODIFIERS)((int)m.LParam & 0xFFFF);       // The modifier of the hotkey that was pressed.
                int id = m.WParam.ToInt32();                                        // The id of the hotkey that was pressed.

                if (cbGuild.Text == "")
                {
                    MessageBox.Show("Please enter a valid guild ID!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                string file = "";
                foreach (int keyset in keysets.Keys)
                {
                    if (KeyConfig.GetOnlyKey(keyset) == (int)key)
                        file = keysets[keyset];
                }
                requests.PlayRequest(file, guilds[cbGuild.Text]);
            }
        }
        

        void LoadSoundList()
        {
            List<string> sounds = requests.GetSoundFiles();

            sounds.ForEach(s =>
            {
                cbSound.Items.Add(s);
            });
        }


        void LoadGuilds() {

            List<List<string>> response = requests.GetGuilds();
            response.ForEach(r =>
            {
                guilds.Add(r[0], r[1]);
                cbGuild.Items.Add(r[0]);
            });

        }


        void LoadKeyList()
        {
            foreach (Keys key in Enum.GetValues(typeof(Keys)))
            {
                if ((int)key < 254)
                    cbKey.Items.Add(Enum.GetName(typeof(Keys), key));
            }
        }


        void LoadRegisteredKeys()
        {
            if (Settings.Default.RegisteredKeys == "")
                return;
            foreach (string elementset in Settings.Default.RegisteredKeys.Split(';'))
            {
                Console.WriteLine(elementset);
                if (elementset == "")
                    return;
                string[] split = elementset.Split('|');
                Console.WriteLine("test: '" + split[0] + "'");
                KeyConfig conf = new KeyConfig(Int32.Parse(split[0]));
                keysets.Add(conf.keycode, split[1]);
                lbKeys.Items.Add(conf.ToString("- " + split[1]));
                RegisterHotKey(this.Handle, keysets.Count - 1, conf.modifiers, (int)conf.key);
            }
        }


        void SaveRegisteredKeys()
        {
            if (keysets.Count == 0)
                Settings.Default.RegisteredKeys = "";
            string save = "";
            foreach (int key in keysets.Keys)
            {
                save += key.ToString() + "|" + keysets[key] + ";";
                Console.WriteLine(save);
            }
            Settings.Default.RegisteredKeys = save;
            Settings.Default.Save();
        }

        #region UI FUNCTIONS

        private void btLogin_Click(object sender, EventArgs e)
        {
            requests = new Requests(tbToken.Text);
            if (requests.CheckToken())
            {
                tbToken.Enabled = false;
                btLogin.Enabled = false;
                btLogin.Text = "Logged in";
                btLogin.BackColor = Color.Green;
                cbGuild.Enabled = true;

                panKey.Enabled = true;

                Settings.Default.Token = tbToken.Text;
                Settings.Default.Save();

                LoadSoundList();
                LoadGuilds();
                LoadRegisteredKeys();

                if (Settings.Default.GuildID != null && Settings.Default.GuildID != "" && guilds.ContainsValue(Settings.Default.GuildID))
                {
                    foreach (string key in guilds.Keys)
                    {
                        if (guilds[key] == Settings.Default.GuildID)
                            cbGuild.Text = key;
                    }
                }
            }
            else
            {
                MessageBox.Show("Invalid token!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

        }


        private void btAddkey_Click(object sender, EventArgs e)
        {
            int keycode = 0;

            keycode = cbAlt.Checked ? keycode | (int)KEYMODIFIERS.ALT : keycode;
            keycode = cbStrg.Checked ? keycode | (int)KEYMODIFIERS.CONTROL : keycode;
            keycode = cbShift.Checked ? keycode | (int)KEYMODIFIERS.SHIFT : keycode;
            keycode = cbWindows.Checked ? keycode | (int)KEYMODIFIERS.WINKEY : keycode;

            int mods = keycode;
            int key = (int)Enum.Parse(typeof(Keys), cbKey.Text);

            keycode |= key;

            if (!keysets.ContainsKey(keycode))
            {
                keysets.Add(keycode, cbSound.Text);
                lbKeys.Items.Add(new KeyConfig(keycode).ToString("- " + cbSound.Text));
                RegisterHotKey(this.Handle, keysets.Count - 1, mods >> 9, key);
                foreach (int kelkeyy in keysets.Keys) Console.WriteLine(kelkeyy);
                SaveRegisteredKeys();
            }
        }

        
        private void cbKey_SelectedIndexChanged(object sender, EventArgs e)
        {
            Console.WriteLine(cbKey.Text, cbSound.Text);
            btAddkey.Enabled = cbKey.Text != "" && cbSound.Text != "";
        }


        private void cbSound_SelectedIndexChanged(object sender, EventArgs e)
        {
            btAddkey.Enabled = cbKey.Text != "" && cbSound.Text != "";
        }
        

        private void btRemove_Click(object sender, EventArgs e)
        {
            int keycode = Int32.Parse(lbKeys.SelectedItem.ToString().Split('(')[1].Split(')')[0]);
            keysets.Remove(keycode);
            UnregisterHotKey(this.Handle, lbKeys.SelectedIndex);
            lbKeys.Items.RemoveAt(lbKeys.SelectedIndex);
            SaveRegisteredKeys();
        }


        private void lbKeys_SelectedIndexChanged(object sender, EventArgs e)
        {
            btRemove.Enabled = true;
        }


        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (cbGuild.Text != null && cbGuild.Text != "" && guilds.ContainsKey(cbGuild.Text))
            {
                Settings.Default.GuildID = guilds[cbGuild.Text];
                Settings.Default.Save();
            }
        }

        #endregion

        #region EXTERNAL DLLS
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);
        #endregion

    }
}
