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

function Awake()
{
   showLobby = false;
}

function OnGUI()
{
   var e : Event = Event.current;

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

            GUILayout.BeginHorizontal();
               if (Network.isServer && GUILayout.Button("Start Game"))
               {
                  Game.control.InitRound();
               }
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
               if (GUILayout.Button("Ready"))
               {
                  Game.player.isReady = !Game.player.isReady;
                  if (Network.isServer)
                     Game.control.ToServerReady(Game.player.isReady, new NetworkMessageInfo());
                  else
                     Game.control.netView.RPC("ToServerReady", RPCMode.Server, Game.player.isReady);
               }
            GUILayout.EndHorizontal();

            GUILayout.BeginHorizontal();
               if (GUILayout.Button("Change Teams"))
               {
                  Game.player.teamID = (Game.player.teamID==1) ? 2 : 1;
                  if (Network.isServer)
                     Game.control.ToServerChangeTeam(Game.player.teamID, new NetworkMessageInfo());
                  else
                     Game.control.netView.RPC("ToServerChangeTeam", RPCMode.Server, Game.player.teamID);
               }
            GUILayout.EndHorizontal();

            GUILayout.Space(20);

            GUILayout.Label("Players", textStyle);

            for (var pd : PlayerData in Game.control.players.Values)
            {
               GUILayout.BeginVertical();
                  GUILayout.BeginHorizontal();
                     var str : String = pd.nameID + " - " + pd.teamID + (pd.isReady?" READY":"");
                     GUILayout.Label(str);
                     if (Network.isServer && pd != Game.player && GUILayout.Button("Kick"))
                     {
                        Network.CloseConnection(pd.netPlayer, true);
                     }
                  GUILayout.EndHorizontal();
               GUILayout.EndVertical();
            }

            GUILayout.Space(20);
            //for (var Game.control.players

            GUILayout.BeginHorizontal();
               if (GUILayout.Button("Back"))
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
               Game.player.nameID = GUILayout.TextField(Game.player.nameID, GUILayout.MinWidth(120));
            GUILayout.EndHorizontal();

            GUILayout.Space(20);

            if (GUILayout.Button(GUIContent("Start Server", "StartServerButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
            {
               // Creating server
               Network.Disconnect();
               Network.InitializeServer(32, listenPort, useNAT);
               // Notify our objects that the level and the network is ready
               //for (var go : GameObject in FindObjectsOfType(GameObject))
                  //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
               Game.hostType = 1;
               Game.control.NewGame();
               showLobby = true;
            }

            GUILayout.Space(10);

            GUILayout.BeginHorizontal();
               if (GUILayout.Button(GUIContent("Connect To", "ConnectButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
               {
                  // Connecting to the server
                  Network.Connect(remoteIP, remotePort);
                  Debug.Log("Connect: "+remoteIP+":"+remotePort );
                  Game.hostType = 2;
               }
               GUILayout.Space(10);
               // Fields to insert ip address and port
               remoteIP = GUILayout.TextField(remoteIP, GUILayout.MinWidth(120));
               remotePort = parseInt(GUILayout.TextField(remotePort.ToString()));
            GUILayout.EndHorizontal();

            GUILayout.Space(25);

            if (GUILayout.Button(GUIContent("Main Menu", "MainMenuButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
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
   enabled = (id==guiID);
}