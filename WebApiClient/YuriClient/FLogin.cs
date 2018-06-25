using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using YuriClient.Properties;

namespace YuriClient
{
    public partial class FLogin : Form
    {
        public FLogin()
        {
            InitializeComponent();
        }
        
        private void FLogin_Load(object sender, EventArgs e)
        {
            tbUrl.Text = Settings.Default.APIUrl?.ToString();
            tbToken.Text = Settings.Default.Token?.ToString();
            tbClientId.Text = Settings.Default.ClientID?.ToString();
        }

        private void tbToken_TextChanged(object sender, EventArgs e)
        {
            btLogin.Enabled = tbClientId.Text != "" && tbToken.Text != "" && tbUrl.Text != "";
        }

        private void tbClientId_TextChanged(object sender, EventArgs e)
        {
            btLogin.Enabled = tbClientId.Text != "" && tbToken.Text != "" && tbUrl.Text != "";
        }


        private void tbUrl_TextChanged(object sender, EventArgs e)
        {
            btLogin.Enabled = tbClientId.Text != "" && tbToken.Text != "" && tbUrl.Text != "";
        }

        private void btLogin_Click(object sender, EventArgs e)
        {
            Requests requests = new Requests(tbToken.Text, tbUrl.Text, tbClientId.Text);
            
            string rescode = requests.Login();

            if (rescode == "OK")
            {
                Settings.Default.APIUrl = tbUrl.Text;
                Settings.Default.Token = tbToken.Text;
                Settings.Default.ClientID = tbClientId.Text;
                Settings.Default.Save();
                this.Hide();
                new FMain(requests).Show();
            }
            else
            {
                MessageBox.Show("Invalid login!\nError: " + rescode, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
