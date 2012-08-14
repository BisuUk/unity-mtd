#pragma strict

var ipInput : Transform;
var portInput : Transform;

var remoteIP = "127.0.0.1";
var remotePort = 25000;
var listenPort = 25000;

var useNAT = false;
var yourIP = "";
var yourPort = "";
var textStyle : GUIStyle;



static var guiID : int = 1;
private var buttonWidth : int;
private var buttonHeight : int;



function Awake()
{
   Network.minimumAllocatableViewIDs = 500;
}

function OnGUI()
{
   var e : Event = Event.current;
/*
   buttonWidth = (Screen.width*0.10);
   buttonHeight = (Screen.height*0.05);
   textStyle.alignment = TextAnchor.MiddleLeft;

   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(20);

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

         //if (GUILayout.Button(GUIContent("Start Server", "StartServerButton"), GUILayout.Width(buttonWidth), GUILayout.Height(buttonHeight)))
         //{
         //   OnPressHost();
         //   // Show lobby
         //}

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

      GUILayout.BeginVertical();
   GUILayout.EndArea();
*/
   // ESC returns to main
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            OnPressBack();
         break;
      }
   }
}

function OnConnectedToServer()
{
   Debug.Log("OnConnectedToServer");
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

function OnPressBack()
{
   GUIControl2.SwitchGUI(0);
}

function OnPressHost()
{
   // Creating server
   Network.Disconnect();
   Network.InitializeServer(32, listenPort, useNAT);
   // Notify our objects that the level and the network is ready
   //for (var go : GameObject in FindObjectsOfType(GameObject))
      //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
   Game.hostType = 1;
   Game.control.NewNetworkGame();

   GUIControl.SwitchGUI(101);
   GUIControl2.SwitchGUI(-1);
}

function OnPressConnect()
{
   //remoteIP = ipInput.GetComponent(UILabel).text;
   //remotePort = parseInt(portInput.GetComponent(UILabel).text);

   // Connecting to the server
   Network.Connect(remoteIP, remotePort);
   Debug.Log("Connect: "+remoteIP+":"+remotePort );
   Game.hostType = 2;
}