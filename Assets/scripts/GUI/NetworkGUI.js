#pragma strict

var remoteIP = "127.0.0.1";
var remotePort = 25000;
var listenPort = 25000;
var useNAT = false;
var yourIP = "";
var yourPort = "";

static var guiID : int = 1;

function OnGUI()
{
   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(20);
         // Checking if you are connected to the server or not
         if (Network.peerType == NetworkPeerType.Disconnected)
         {
            if (GUILayout.Button(GUIContent("Start Server", "StartServerButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
            {
               // Creating server
               Network.InitializeServer(32, listenPort, useNAT);

               // Notify our objects that the level and the network is ready
               for (var go : GameObject in FindObjectsOfType(GameObject))
                  go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
               Game.hostType = 1;
            }

            GUILayout.Space(10);

            GUILayout.BeginHorizontal();
               if (GUILayout.Button(GUIContent("Connect To", "ConnectButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
               {
                  // Connecting to the server
                  Network.Connect(remoteIP, remotePort);
                  Debug.Log("Connect button: "+remoteIP+":"+remotePort );
                  Game.hostType = 2;
               }
               GUILayout.Space(10);
               // Fields to insert ip address and port
               remoteIP = GUILayout.TextField(remoteIP, GUILayout.MinWidth(120));
               remotePort = parseInt(GUILayout.TextField(remotePort.ToString()));
            GUILayout.EndHorizontal();

            GUILayout.Space(25);

            if (GUILayout.Button(GUIContent("Main Menu", "MainMenuButton"), GUILayout.MinHeight(40), GUILayout.Width(100)))
            {
               GUIControl.SwitchGUI(0);
            }
         }
         else
         {
            // Getting your ip address and port
            var ipaddress = Network.player.ipAddress;
            var port = Network.player.port.ToString();
            GUI.Label(new Rect(140,20,250,40),"IP Address: "+ipaddress+":"+port);
            if (GUI.Button (new Rect(10,10,100,50),"Disconnect"))
            {
               // Disconnect from the server
               Network.Disconnect();
            }
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