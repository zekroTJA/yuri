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
    [DataContract]
    internal class SoundsResult
    {
        [DataMember]
        internal string status;
        [DataMember]
        internal int code;
        [DataMember]
        internal object desc;
    }

    class Requests
    {
        private const string APIURL = "http://zekro.de:6612/";
        private string key;

        public Requests(string key)
        {
            this.key = key;
        }

        public bool CheckToken()
        {
            string json = BasicRequest("token?token=" + this.key);
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
            WebRequest request = WebRequest.Create(APIURL + dir);

            // request.Credentials = CredentialCache.DefaultCredentials;
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

        public void PlayRequest(string file, string guildID)
        {
            BasicRequest("?token=" + this.key + "&guild=" + guildID + "&file=" + file);
        }

    }
}
