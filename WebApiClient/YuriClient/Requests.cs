using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Runtime.Serialization.Json;
using System.Runtime.Serialization;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Windows.Forms;

namespace YuriClient
{

    class Requests
    {
        private string key;
        private string url;

        public Requests(string key, string url)
        {
            this.key = key;
            this.url = url;
        }

        public bool CheckToken()
        {
            string json = BasicRequest("token?token=" + this.key);
            if (json == "")
                return false;

            var def = new
            {
                status = "",
                code = 0
            };
            var res = JsonConvert.DeserializeAnonymousType(json, def);
            Console.WriteLine(res.code);
            return res.code == 0;
        }

        private string BasicRequest(string dir)
        {
            try
            {
                WebRequest request = WebRequest.Create(url + "/" + dir);
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                Stream dataStream = response.GetResponseStream();
                StreamReader reader = new StreamReader(dataStream);
                string responseFromServer = reader.ReadToEnd();
                Console.WriteLine(responseFromServer);

                reader.Close();
                dataStream.Close();
                response.Close();

                return responseFromServer;
            }
            catch (Exception e)
            {
                MessageBox.Show("Connection error:\n" + e.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return "";
            }
        }

        public List<string> GetSoundFiles()
        {
            var definition = new
            {
                status = "",
                code = 0,
                desc = new
                {
                    n = 0,
                    sounds = new List<string>()
                }
            };
            string json = BasicRequest("sounds/?token=" + this.key);
            var res = JsonConvert.DeserializeAnonymousType(json, definition);
            return res.desc.sounds;
        }

        public List<List<string>> GetGuilds()
        {
            var definition = new
            {
                status = "",
                code = 0,
                desc = new {
                    n = 0,
                    servers = new List<List<string>>()
                }
            };
            string json = BasicRequest("guilds?token=" + this.key);
            var res = JsonConvert.DeserializeAnonymousType(json, definition);
            return res.desc.servers;
        }

        public void PlayRequest(string file, string guildID)
        {
            BasicRequest("?token=" + this.key + "&guild=" + guildID + "&file=" + file);
        }

    }
}
