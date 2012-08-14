#pragma strict

var remoteIP = "127.0.0.1";
var remotePort = 25000;
var listenPort = 25000;
var useNAT = false;
var yourIP = "";
var yourPort = "";
var textStyle : GUIStyle;

static var guiID : int = 101;

private var buttonWidth : int;
private var buttonHeight : int;

function Awake()
{
   //showLobby = false;
   Network.minimumAllocatableViewIDs = 500;
}

function OnGUI()
{
   var e : Event = Event.current;
   buttonWidth = (Screen.width*0.10);
   buttonHeight = (Screen.height*0.05);
   textStyle.alignment = TextAnchor.MiddleLeft;

   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(20);

         // Getting your ip address and port
         if (Network.isServer)
         {
            var ipaddress = Network.player.ipAddress;
            var port = Network.player.port.ToString();
            GUILayout.Label("IP Address: "+ipaddress+":"+port);
         }

         GUILayout.BeginHorizontal();
            GUILayout.Label("Level:");
         GUILayout.EndHorizontal();

         GUILayout.BeginHorizontal();
            GUILayout.Label("Round Time:");
         GUILayout.EndHorizontal();

         GUILayout.Space(20);

         textStyle.normal.textColor = Color.gray;
         GUILayout.Label("Players", textStyle);


         for (var pd : PlayerData in Game.control.players.Values)
         {
            GUILayout.BeginVertical();
               GUILayout.BeginHorizontal();

                  if (Network.isServer)
                  {
                     if (pd != Game.player)
                     {
                        if (GUILayout.Button("Kick", GUILayout.Width(buttonWidth/2), GUILayout.Height(buttonHeight)))
                           Network.CloseConnection(pd.netPlayer, true);
                     }
                     else
                     {
                        GUILayout.Label("", GUILayout.Width(buttonWidth/2));
                     }
                  }

                  var str : String = pd.nameID;
                  textStyle.alignment = TextAnchor.MiddleLeft;
                  textStyle.normal.textColor = Color.white;
                  textStyle.fontSize = 20;
                  GUILayout.Label(str, textStyle, GUILayout.Width(buttonWidth*2), GUILayout.Height(buttonHeight));
                  textStyle.alignment = TextAnchor.MiddleCenter;
                  textStyle.fontSize = 15;

                  GUILayout.Space(10);

                  if (pd.netPlayer == Network.player)
                  {
                     var teamButtonStr : String = (Game.player.teamID==1) ? "ATTACKER" : "DEFENDER";
                     if (GUILayout.Button(teamButtonStr, GUILayout.Width(buttonWidth*1.5), GUILayout.Height(buttonHeight)))
                     {
                        if (!Game.player.isReady)
                        {
                           Game.player.teamID = (Game.player.teamID==1) ? 2 : 1;
                           if (Network.isServer)
                              Game.control.ToServerChangeTeam(Game.player.teamID, new NetworkMessageInfo());
                           else
                              Game.control.netView.RPC("ToServerChangeTeam", RPCMode.Server, Game.player.teamID);
                        }
                     }

                     GUILayout.Space(10);

                     str = (Game.player.isReady) ? "READY" : "UNREADY";
                     if (GUILayout.Button(str, GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
                     {
                        Game.player.isReady = !Game.player.isReady;
                        if (Network.isServer)
                           Game.control.ToServerReady(Game.player.isReady, new NetworkMessageInfo());
                        else
                           Game.control.netView.RPC("ToServerReady", RPCMode.Server, Game.player.isReady);
                     }
                  }
                  else
                  {
                     GUILayout.Label((pd.teamID==1) ? "ATTACKER" : "DEFENDER", textStyle, GUILayout.Width(buttonWidth*1.5), GUILayout.Height(buttonHeight));
                     GUILayout.Space(10);
                     textStyle.normal.textColor = (pd.isReady) ? Color.green : Color.red;
                     GUILayout.Label((pd.isReady?" READY":"UNREADY"), textStyle, GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight));
                  }

               GUILayout.EndHorizontal();
            GUILayout.EndVertical();
         }

         textStyle.alignment = TextAnchor.MiddleLeft;
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 20;

         GUILayout.Space(20);

         GUILayout.BeginHorizontal();
            if (Network.isServer && GUILayout.Button("Start Game", GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
            {
               Game.control.InitRound();
            }
         GUILayout.EndHorizontal();

         GUILayout.Space(20);
         //for (var Game.control.players

         GUILayout.BeginHorizontal();
            if (GUILayout.Button("Back", GUILayout.Width(buttonWidth/2), GUILayout.Height(buttonHeight)))
            {
               Network.Disconnect();
               GUIControl.SwitchGUI(1);
               GUIControl2.SwitchGUI(1);
            }
         GUILayout.EndHorizontal();

      GUILayout.BeginVertical();
   GUILayout.EndArea();

   // ESC returns to main
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GUIControl.SwitchGUI(0);
         break;
      }
   }
}


function Initialize()
{
   Game.player.teamID = 1;
   Network.Disconnect();
}


function OnSwitchGUI(id : int)
{
   if (id == guiID)
   {
      Game.control.roundInProgress = false;
      Game.control.matchInProgress = false;
      Game.control.allowNewConnections = true;
      Game.player.isReady = false;

      enabled = true;
   }
   else
   {
      enabled = false;
   }
}