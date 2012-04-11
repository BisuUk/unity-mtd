#pragma strict

var remoteIP = "127.0.0.1";
var remotePort = 25000;
var listenPort = 25000;
var useNAT = false;
var yourIP = "";
var yourPort = "";

private var attackGUI  : AttackGUI;
private var defendGUI  : DefendGUI;
private var networkGUI : NetworkGUI;

function switchGUI(which : int)
{
   switch (which)
   {
      case 0:
         attackGUI.enabled = false;
         defendGUI.enabled = false;
         networkGUI.enabled = true;
         break;
      case 1:
         attackGUI.enabled = true;
         defendGUI.enabled = false;
         networkGUI.enabled = false;
         break;
      case 2:
         attackGUI.enabled = false;
         defendGUI.enabled = true;
         networkGUI.enabled = false;
         break;
   }
}

function Start()
{
   attackGUI = Camera.main.GetComponent(AttackGUI);
   defendGUI = Camera.main.GetComponent(DefendGUI);
   networkGUI = Camera.main.GetComponent(NetworkGUI);
}

function OnGUI()
{
   // Checking if you are connected to the server or not
   if (Network.peerType == NetworkPeerType.Disconnected)
   {
      // If not connected
      if (GUI.Button (new Rect(10,10,100,30),"Connect"))
      {
         // Connecting to the server
         Network.Connect(remoteIP, remotePort);
         Debug.Log("Connect button: "+remoteIP+":"+remotePort );
      }

      if (GUI.Button (new Rect(10,50,100,30),"Start Server"))
      {
         // Creating server
         Network.InitializeServer(32, listenPort, useNAT);

         // Notify our objects that the level and the network is ready
         for (var go : GameObject in FindObjectsOfType(GameObject))
            go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
      }

      if (GUI.Button (new Rect(10,90,100,30),"Standalone"))
      {
         switchGUI(2);
      }

      // Fields to insert ip address and port
      remoteIP = GUI.TextField(new Rect(120,10,100,20), remoteIP);
      remotePort = parseInt(GUI.TextField(new Rect(230,10,45,20),remotePort.ToString()));
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
}


function OnConnectedToServer()
{
   Debug.Log("OnConnectedToServer");

   GameData.player.isAttacker=true;
   GameData.player.credits = GameData.map.attackStartCredits;
   switchGUI(1);
   // Notify our objects that the level and the network are ready
   //for (var go : GameObject in FindObjectsOfType(GameObject))
      //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
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
      switchGUI(0);
   }
}

function OnPlayerConnected(player: NetworkPlayer)
{
   Debug.Log("Player connected from " + player.ipAddress + ":" + player.port);
   // Populate a data structure with player information ...
   GameData.player.isAttacker = false;
   GameData.player.credits = GameData.map.defendStartCredits;
   switchGUI(2);
}


function OnPlayerDisconnected(player: NetworkPlayer)
{
    Debug.Log("Clean up after player " +  player);
    Network.RemoveRPCs(player);
    Network.DestroyPlayerObjects(player);
}