namespace YuriClient
{
    partial class FMain
    {
        /// <summary>
        /// Erforderliche Designervariable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Verwendete Ressourcen bereinigen.
        /// </summary>
        /// <param name="disposing">True, wenn verwaltete Ressourcen gelöscht werden sollen; andernfalls False.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Vom Windows Form-Designer generierter Code

        /// <summary>
        /// Erforderliche Methode für die Designerunterstützung.
        /// Der Inhalt der Methode darf nicht mit dem Code-Editor geändert werden.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(FMain));
            this.btLogin = new System.Windows.Forms.Button();
            this.tbToken = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.lbKeys = new System.Windows.Forms.ListBox();
            this.cbSound = new System.Windows.Forms.ComboBox();
            this.cbKey = new System.Windows.Forms.ComboBox();
            this.btAddkey = new System.Windows.Forms.Button();
            this.panKey = new System.Windows.Forms.Panel();
            this.btRemove = new System.Windows.Forms.Button();
            this.cbAlt = new System.Windows.Forms.CheckBox();
            this.cbWindows = new System.Windows.Forms.CheckBox();
            this.cbShift = new System.Windows.Forms.CheckBox();
            this.cbStrg = new System.Windows.Forms.CheckBox();
            this.textBox2 = new System.Windows.Forms.Label();
            this.cbGuild = new System.Windows.Forms.ComboBox();
            this.label2 = new System.Windows.Forms.Label();
            this.tbAPIUrl = new System.Windows.Forms.TextBox();
            this.panKey.SuspendLayout();
            this.SuspendLayout();
            // 
            // btLogin
            // 
            this.btLogin.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btLogin.Location = new System.Drawing.Point(796, 10);
            this.btLogin.Name = "btLogin";
            this.btLogin.Size = new System.Drawing.Size(75, 23);
            this.btLogin.TabIndex = 0;
            this.btLogin.Text = "Login";
            this.btLogin.UseVisualStyleBackColor = true;
            this.btLogin.Click += new System.EventHandler(this.btLogin_Click);
            // 
            // tbToken
            // 
            this.tbToken.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.tbToken.Location = new System.Drawing.Point(65, 10);
            this.tbToken.Name = "tbToken";
            this.tbToken.Size = new System.Drawing.Size(333, 20);
            this.tbToken.TabIndex = 1;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(12, 13);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(47, 13);
            this.label1.TabIndex = 2;
            this.label1.Text = "TOKEN:";
            // 
            // lbKeys
            // 
            this.lbKeys.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.lbKeys.FormattingEnabled = true;
            this.lbKeys.Location = new System.Drawing.Point(0, 71);
            this.lbKeys.Name = "lbKeys";
            this.lbKeys.Size = new System.Drawing.Size(859, 264);
            this.lbKeys.TabIndex = 3;
            this.lbKeys.SelectedIndexChanged += new System.EventHandler(this.lbKeys_SelectedIndexChanged);
            // 
            // cbSound
            // 
            this.cbSound.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.cbSound.FormattingEnabled = true;
            this.cbSound.Location = new System.Drawing.Point(128, 31);
            this.cbSound.Name = "cbSound";
            this.cbSound.Size = new System.Drawing.Size(647, 21);
            this.cbSound.TabIndex = 5;
            this.cbSound.SelectedIndexChanged += new System.EventHandler(this.cbSound_SelectedIndexChanged);
            // 
            // cbKey
            // 
            this.cbKey.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.cbKey.FormattingEnabled = true;
            this.cbKey.Location = new System.Drawing.Point(128, 4);
            this.cbKey.Name = "cbKey";
            this.cbKey.Size = new System.Drawing.Size(647, 21);
            this.cbKey.TabIndex = 6;
            this.cbKey.SelectedIndexChanged += new System.EventHandler(this.cbKey_SelectedIndexChanged);
            // 
            // btAddkey
            // 
            this.btAddkey.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btAddkey.Enabled = false;
            this.btAddkey.Location = new System.Drawing.Point(781, 4);
            this.btAddkey.Name = "btAddkey";
            this.btAddkey.Size = new System.Drawing.Size(75, 23);
            this.btAddkey.TabIndex = 7;
            this.btAddkey.Text = "Add";
            this.btAddkey.UseVisualStyleBackColor = true;
            this.btAddkey.Click += new System.EventHandler(this.btAddkey_Click);
            // 
            // panKey
            // 
            this.panKey.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.panKey.Controls.Add(this.btRemove);
            this.panKey.Controls.Add(this.cbAlt);
            this.panKey.Controls.Add(this.cbWindows);
            this.panKey.Controls.Add(this.cbShift);
            this.panKey.Controls.Add(this.cbStrg);
            this.panKey.Controls.Add(this.lbKeys);
            this.panKey.Controls.Add(this.btAddkey);
            this.panKey.Controls.Add(this.cbKey);
            this.panKey.Controls.Add(this.cbSound);
            this.panKey.Enabled = false;
            this.panKey.Location = new System.Drawing.Point(15, 67);
            this.panKey.Name = "panKey";
            this.panKey.Size = new System.Drawing.Size(859, 333);
            this.panKey.TabIndex = 8;
            // 
            // btRemove
            // 
            this.btRemove.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btRemove.Enabled = false;
            this.btRemove.Location = new System.Drawing.Point(781, 29);
            this.btRemove.Name = "btRemove";
            this.btRemove.Size = new System.Drawing.Size(75, 23);
            this.btRemove.TabIndex = 12;
            this.btRemove.Text = "Remove";
            this.btRemove.UseVisualStyleBackColor = true;
            this.btRemove.Click += new System.EventHandler(this.btRemove_Click);
            // 
            // cbAlt
            // 
            this.cbAlt.AutoSize = true;
            this.cbAlt.Location = new System.Drawing.Point(66, 8);
            this.cbAlt.Name = "cbAlt";
            this.cbAlt.Size = new System.Drawing.Size(46, 17);
            this.cbAlt.TabIndex = 11;
            this.cbAlt.Text = "ALT";
            this.cbAlt.UseVisualStyleBackColor = true;
            // 
            // cbWindows
            // 
            this.cbWindows.AutoSize = true;
            this.cbWindows.Location = new System.Drawing.Point(66, 33);
            this.cbWindows.Name = "cbWindows";
            this.cbWindows.Size = new System.Drawing.Size(48, 17);
            this.cbWindows.TabIndex = 10;
            this.cbWindows.Text = "WIN";
            this.cbWindows.UseVisualStyleBackColor = true;
            // 
            // cbShift
            // 
            this.cbShift.AutoSize = true;
            this.cbShift.Location = new System.Drawing.Point(0, 33);
            this.cbShift.Name = "cbShift";
            this.cbShift.Size = new System.Drawing.Size(57, 17);
            this.cbShift.TabIndex = 9;
            this.cbShift.Text = "SHIFT";
            this.cbShift.UseVisualStyleBackColor = true;
            // 
            // cbStrg
            // 
            this.cbStrg.AutoSize = true;
            this.cbStrg.Location = new System.Drawing.Point(0, 10);
            this.cbStrg.Name = "cbStrg";
            this.cbStrg.Size = new System.Drawing.Size(56, 17);
            this.cbStrg.TabIndex = 8;
            this.cbStrg.Text = "STRG";
            this.cbStrg.UseVisualStyleBackColor = true;
            // 
            // textBox2
            // 
            this.textBox2.AutoSize = true;
            this.textBox2.Location = new System.Drawing.Point(12, 39);
            this.textBox2.Name = "textBox2";
            this.textBox2.Size = new System.Drawing.Size(46, 13);
            this.textBox2.TabIndex = 9;
            this.textBox2.Text = "GUILID:";
            // 
            // cbGuild
            // 
            this.cbGuild.Enabled = false;
            this.cbGuild.FormattingEnabled = true;
            this.cbGuild.Location = new System.Drawing.Point(65, 36);
            this.cbGuild.Name = "cbGuild";
            this.cbGuild.Size = new System.Drawing.Size(725, 21);
            this.cbGuild.TabIndex = 10;
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(413, 13);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(49, 13);
            this.label2.TabIndex = 11;
            this.label2.Text = "APIURL:";
            // 
            // tbAPIUrl
            // 
            this.tbAPIUrl.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.tbAPIUrl.Location = new System.Drawing.Point(468, 10);
            this.tbAPIUrl.Name = "tbAPIUrl";
            this.tbAPIUrl.Size = new System.Drawing.Size(322, 20);
            this.tbAPIUrl.TabIndex = 12;
            // 
            // FMain
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(886, 421);
            this.Controls.Add(this.tbAPIUrl);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.cbGuild);
            this.Controls.Add(this.textBox2);
            this.Controls.Add(this.panKey);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.tbToken);
            this.Controls.Add(this.btLogin);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.MinimumSize = new System.Drawing.Size(384, 260);
            this.Name = "FMain";
            this.Text = "Yuri WebAPIClient v.0.1.0";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.Form1_FormClosing);
            this.Load += new System.EventHandler(this.Form1_Load);
            this.panKey.ResumeLayout(false);
            this.panKey.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button btLogin;
        private System.Windows.Forms.TextBox tbToken;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.ListBox lbKeys;
        private System.Windows.Forms.ComboBox cbSound;
        private System.Windows.Forms.ComboBox cbKey;
        private System.Windows.Forms.Button btAddkey;
        private System.Windows.Forms.Panel panKey;
        private System.Windows.Forms.CheckBox cbAlt;
        private System.Windows.Forms.CheckBox cbWindows;
        private System.Windows.Forms.CheckBox cbShift;
        private System.Windows.Forms.CheckBox cbStrg;
        private System.Windows.Forms.Button btRemove;
        private System.Windows.Forms.Label textBox2;
        private System.Windows.Forms.ComboBox cbGuild;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.TextBox tbAPIUrl;
    }
}

