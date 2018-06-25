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

    public class Requests
    {
        public string key { get; }
        public string url { get; }
        public string clientid { get; }

        public Requests(string key, string url, string clientid)
        {
            this.key = key;
            this.url = url;
            this.clientid = clientid;
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

        public string Login()
        {
            string json = BasicRequest("login?token=" + this.key + "&user=" + this.clientid);
            if (json == "")
                return "no response";
            var def = new
            {
                status = "",
                code = 0,
                desc = ""
            };
            var res = JsonConvert.DeserializeAnonymousType(json, def);
            return res.desc;
        }

        public void Logout()
        {
            BasicRequest("logout?token=" + this.key + "&user=" + this.clientid);
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
        
        

        public void PlayRequest(string file)
        {
            BasicRequest("play?token=" + this.key + "&user=" + this.clientid + "&file=" + file);
        }

        #region DEPRECATED
        // public bool CheckToken()
        // {
        //     string json = BasicRequest("token?token=" + this.key);
        //     if (json == "")
        //         return false;
        // 
        //     var def = new
        //     {
        //         status = "",
        //         code = 0
        //     };
        //     var res = JsonConvert.DeserializeAnonymousType(json, def);
        //     Console.WriteLine(res.code);
        //     return res.code == 0;
        // }
        // 
        // public List<List<string>> GetGuilds()
        // {
        //     var definition = new
        //     {
        //         status = "",
        //         code = 0,
        //         desc = new
        //         {
        //             n = 0,
        //             servers = new List<List<string>>()
        //         }
        //     };
        //     string json = BasicRequest("guilds?token=" + this.key);
        //     var res = JsonConvert.DeserializeAnonymousType(json, definition);
        //     return res.desc.servers;
        // }
        #endregion

    }
}
