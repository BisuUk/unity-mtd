#pragma strict

var remoteIP = "127.0.0.1";
var remotePort = 25000;
var listenPort = 25000;
var useNAT = false;
var yourIP = "";
var yourPort = "";
var textStyle : GUIStyle;
var netView : NetworkView;

static var guiID : int = 1;
private var showLobby : boolean;
private var buttonWidth : int;
private var buttonHeight : int;

function Awake()
{
   showLobby = false;
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

         if (showLobby)
         {
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
                  Game.control.InitRound(true);
               }
            GUILayout.EndHorizontal();

            GUILayout.Space(20);
            //for (var Game.control.players

            GUILayout.BeginHorizontal();
               if (GUILayout.Button("Back", GUILayout.Width(buttonWidth/2), GUILayout.Height(buttonHeight)))
               {
                  showLobby = false;
                  Network.Disconnect();
                  GUIControl.SwitchGUI(1);
               }
            GUILayout.EndHorizontal();
         }
         else //if (Network.peerType == NetworkPeerType.Disconnected)
         {
            GUILayout.BeginHorizontal();
               GUILayout.Label("PlayerID:");

               var prefName : String = "";
               if (PlayerPrefs.HasKey("UNITYMTDPLAYERID"))
                  prefName = PlayerPrefs.GetString("UNITYMTDPLAYERID");
               Game.player.nameID = GUILayout.TextField(prefName, GUILayout.MinWidth(150));
               if (Game.player.nameID != prefName)
                  PlayerPrefs.SetString("UNITYMTDPLAYERID", Game.player.nameID);
            GUILayout.EndHorizontal();

            GUILayout.Space(20);

            if (GUILayout.Button(GUIContent("Start Server", "StartServerButton"), GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
            {
               // Creating server
               Network.Disconnect();
               Network.InitializeServer(32, listenPort, useNAT);
               // Notify our objects that the level and the network is ready
               //for (var go : GameObject in FindObjectsOfType(GameObject))
                  //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
               Game.hostType = 1;
               Game.control.NewNetworkGame();
               showLobby = true;
            }

            GUILayout.Space(10);

            GUILayout.BeginHorizontal();
               if (GUILayout.Button(GUIContent("Connect To", "ConnectButton"), GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
               {
                  // Connecting to the server
                  Network.Connect(remoteIP, remotePort);
                  Debug.Log("Connect: "+remoteIP+":"+remotePort );
                  Game.hostType = 2;
               }
               GUILayout.Space(10);
               // Fields to insert ip address and port
               var prefIP : String = "127.0.0.1";
               if (PlayerPrefs.HasKey("UNITYMTDREMOTEIP"))
                  prefIP = PlayerPrefs.GetString("UNITYMTDREMOTEIP");
               remoteIP = GUILayout.TextField(prefIP, GUILayout.MinWidth(120));
               if (remoteIP != prefIP)
                  PlayerPrefs.SetString("UNITYMTDREMOTEIP", remoteIP);

               var prefPort : int = 25000;
               if (PlayerPrefs.HasKey("UNITYMTDREMOTEPORT"))
                  prefPort = PlayerPrefs.GetInt("UNITYMTDREMOTEPORT");
               remotePort = parseInt(GUILayout.TextField(prefPort.ToString(), GUILayout.MinWidth(60)));
               if (remotePort != prefPort)
                  PlayerPrefs.SetInt("UNITYMTDREMOTEPORT", remotePort);

            GUILayout.EndHorizontal();

            GUILayout.Space(25);

            if (GUILayout.Button(GUIContent("Main Menu", "MainMenuButton"), GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
               GUIControl.SwitchGUI(0);
         }

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

function OnConnectedToServer()
{
   Debug.Log("OnConnectedToServer");
   showLobby = true;
   // Notify our objects that the level and the network are ready
   //for (var go : GameObject in FindObjectsOfType(GameObject))
      //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
}

function OnPlayerConnected(player : NetworkPlayer)
{
   Debug.Log("Player connected from " + player.ipAddress + ":" + player.port);
}

function OnDisconnectedFromServer(info : NetworkDisconnection)
{
   if (Network.isServer)
   {
      Debug.Log("Local server connection disconnected");
   }
   else
   {
      if (info == NetworkDisconnection.LostConnection)
         Debug.Log("Lost connection to the server");
      else
         Debug.Log("Successfully diconnected from the server");

      Application.LoadLevel("mainmenu");
      GUIControl.SwitchGUI(0);
   }
}

function OnPlayerDisconnected(player: NetworkPlayer)
{
    Debug.Log("Clean up after player " +  player);
    Network.RemoveRPCs(player);
    Network.DestroyPlayerObjects(player);
}

function OnSwitchGUI(id : int)
{
   if (id == guiID)
   {

      showLobby = false;
      Game.control.roundInProgress = false;
      Game.player.teamID = 1;
      Game.player.isReady = false;
      Network.Disconnect();

      enabled = true;
   }
   else
   {
      enabled = false;
   }
}