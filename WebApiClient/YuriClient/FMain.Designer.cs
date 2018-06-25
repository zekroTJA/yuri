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
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(FMain));
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
            this.cbToTray = new System.Windows.Forms.CheckBox();
            this.notifyIcon = new System.Windows.Forms.NotifyIcon(this.components);
            this.cmsTrayIcon = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.maximizeToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.closeToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.label3 = new System.Windows.Forms.Label();
            this.btExportSettings = new System.Windows.Forms.Button();
            this.btImportSettings = new System.Windows.Forms.Button();
            this.btLogout = new System.Windows.Forms.Button();
            this.btRefetch = new System.Windows.Forms.Button();
            this.panKey.SuspendLayout();
            this.cmsTrayIcon.SuspendLayout();
            this.SuspendLayout();
            // 
            // lbKeys
            // 
            this.lbKeys.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.lbKeys.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.lbKeys.FormattingEnabled = true;
            this.lbKeys.Location = new System.Drawing.Point(0, 71);
            this.lbKeys.Margin = new System.Windows.Forms.Padding(3, 3, 3, 10);
            this.lbKeys.Name = "lbKeys";
            this.lbKeys.Size = new System.Drawing.Size(895, 444);
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
            this.cbSound.Size = new System.Drawing.Size(683, 21);
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
            this.cbKey.Size = new System.Drawing.Size(683, 21);
            this.cbKey.TabIndex = 6;
            this.cbKey.SelectedIndexChanged += new System.EventHandler(this.cbKey_SelectedIndexChanged);
            // 
            // btAddkey
            // 
            this.btAddkey.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btAddkey.Enabled = false;
            this.btAddkey.Location = new System.Drawing.Point(817, 4);
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
            this.panKey.Location = new System.Drawing.Point(15, 12);
            this.panKey.Name = "panKey";
            this.panKey.Size = new System.Drawing.Size(895, 526);
            this.panKey.TabIndex = 8;
            // 
            // btRemove
            // 
            this.btRemove.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.btRemove.Enabled = false;
            this.btRemove.Location = new System.Drawing.Point(817, 29);
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
            // cbToTray
            // 
            this.cbToTray.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.cbToTray.AutoSize = true;
            this.cbToTray.Location = new System.Drawing.Point(15, 546);
            this.cbToTray.Name = "cbToTray";
            this.cbToTray.Size = new System.Drawing.Size(133, 17);
            this.cbToTray.TabIndex = 13;
            this.cbToTray.Text = "Minimize to system tray";
            this.cbToTray.UseVisualStyleBackColor = true;
            // 
            // notifyIcon
            // 
            this.notifyIcon.ContextMenuStrip = this.cmsTrayIcon;
            this.notifyIcon.Icon = ((System.Drawing.Icon)(resources.GetObject("notifyIcon.Icon")));
            this.notifyIcon.Text = "notifyIcon1";
            this.notifyIcon.Visible = true;
            this.notifyIcon.MouseDoubleClick += new System.Windows.Forms.MouseEventHandler(this.notifyIcon_MouseDoubleClick);
            // 
            // cmsTrayIcon
            // 
            this.cmsTrayIcon.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.maximizeToolStripMenuItem,
            this.closeToolStripMenuItem});
            this.cmsTrayIcon.Name = "cmsTrayIcon";
            this.cmsTrayIcon.Size = new System.Drawing.Size(125, 48);
            // 
            // maximizeToolStripMenuItem
            // 
            this.maximizeToolStripMenuItem.Name = "maximizeToolStripMenuItem";
            this.maximizeToolStripMenuItem.Size = new System.Drawing.Size(124, 22);
            this.maximizeToolStripMenuItem.Text = "Maximize";
            this.maximizeToolStripMenuItem.Click += new System.EventHandler(this.maximizeToolStripMenuItem_Click);
            // 
            // closeToolStripMenuItem
            // 
            this.closeToolStripMenuItem.Name = "closeToolStripMenuItem";
            this.closeToolStripMenuItem.Size = new System.Drawing.Size(124, 22);
            this.closeToolStripMenuItem.Text = "Close";
            this.closeToolStripMenuItem.Click += new System.EventHandler(this.closeToolStripMenuItem_Click);
            // 
            // label3
            // 
            this.label3.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(823, 547);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(87, 13);
            this.label3.TabIndex = 15;
            this.label3.Text = "© 2018 zekro.de";
            // 
            // btExportSettings
            // 
            this.btExportSettings.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.btExportSettings.Location = new System.Drawing.Point(157, 543);
            this.btExportSettings.Name = "btExportSettings";
            this.btExportSettings.Size = new System.Drawing.Size(97, 21);
            this.btExportSettings.TabIndex = 16;
            this.btExportSettings.Text = "Export config...";
            this.btExportSettings.UseVisualStyleBackColor = true;
            this.btExportSettings.Click += new System.EventHandler(this.btExportSettings_Click);
            // 
            // btImportSettings
            // 
            this.btImportSettings.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.btImportSettings.Location = new System.Drawing.Point(260, 543);
            this.btImportSettings.Name = "btImportSettings";
            this.btImportSettings.Size = new System.Drawing.Size(97, 21);
            this.btImportSettings.TabIndex = 17;
            this.btImportSettings.Text = "Import config...";
            this.btImportSettings.UseVisualStyleBackColor = true;
            this.btImportSettings.Click += new System.EventHandler(this.btImportSettings_Click);
            // 
            // btLogout
            // 
            this.btLogout.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.btLogout.Location = new System.Drawing.Point(363, 543);
            this.btLogout.Name = "btLogout";
            this.btLogout.Size = new System.Drawing.Size(97, 21);
            this.btLogout.TabIndex = 18;
            this.btLogout.Text = "Logout";
            this.btLogout.UseVisualStyleBackColor = true;
            this.btLogout.Click += new System.EventHandler(this.btLogout_Click);
            // 
            // btRefetch
            // 
            this.btRefetch.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.btRefetch.Location = new System.Drawing.Point(466, 543);
            this.btRefetch.Name = "btRefetch";
            this.btRefetch.Size = new System.Drawing.Size(97, 21);
            this.btRefetch.TabIndex = 19;
            this.btRefetch.Text = "Refetch";
            this.btRefetch.UseVisualStyleBackColor = true;
            this.btRefetch.Click += new System.EventHandler(this.btRefetch_Click);
            // 
            // FMain
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(922, 572);
            this.Controls.Add(this.btRefetch);
            this.Controls.Add(this.btLogout);
            this.Controls.Add(this.btImportSettings);
            this.Controls.Add(this.btExportSettings);
            this.Controls.Add(this.label3);
            this.Controls.Add(this.cbToTray);
            this.Controls.Add(this.panKey);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.MinimumSize = new System.Drawing.Size(683, 260);
            this.Name = "FMain";
            this.Text = "Yuri WebAPIClient v.0.1.0";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.Form1_FormClosing);
            this.Load += new System.EventHandler(this.Form1_Load);
            this.Resize += new System.EventHandler(this.FMain_Resize);
            this.panKey.ResumeLayout(false);
            this.panKey.PerformLayout();
            this.cmsTrayIcon.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion
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
        private System.Windows.Forms.CheckBox cbToTray;
        private System.Windows.Forms.NotifyIcon notifyIcon;
        private System.Windows.Forms.ContextMenuStrip cmsTrayIcon;
        private System.Windows.Forms.ToolStripMenuItem maximizeToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem closeToolStripMenuItem;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.Button btExportSettings;
        private System.Windows.Forms.Button btImportSettings;
        private System.Windows.Forms.Button btLogout;
        private System.Windows.Forms.Button btRefetch;
    }
}

