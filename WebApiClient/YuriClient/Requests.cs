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

        public Requests(string key, string url)
        {
            this.key = key;
            this.url = url;
        }

        private string BasicRequest(string dir, string method, object data)
        {
            try
            {
                WebRequest request = WebRequest.Create(url + "/" + dir);
                request.Headers.Add(HttpRequestHeader.Authorization, this.key);
                if (method != "GET")
                {
                    request.ContentType = "application/json";
                    request.Method = method;

                    var dataBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data));
                    var dataStream = request.GetRequestStream();
                    dataStream.Write(dataBytes, 0, dataBytes.Length);
                }
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                Stream responseStream = response.GetResponseStream();
                StreamReader reader = new StreamReader(responseStream);
                string responseFromServer = reader.ReadToEnd();
                Console.WriteLine(responseFromServer);

                reader.Close();
                responseStream.Close();
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
            string json = BasicRequest("api/login", "POST", new { });
            if (json == "")
                return "no response";
            var def = new
            {
                status = "",
                code = 0
            };
            var res = JsonConvert.DeserializeAnonymousType(json, def);
            return res.status;
        }

        public void Logout()
        {
            BasicRequest("api/logout", "POST", new { });
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
            string json = BasicRequest("api/sounds", "GET", new { });
            var res = JsonConvert.DeserializeAnonymousType(json, definition);
            return res.desc.sounds;
        }



        public void PlayRequest(string file)
        {
            BasicRequest("api/play", "POST", new { file });
        }
    }
}