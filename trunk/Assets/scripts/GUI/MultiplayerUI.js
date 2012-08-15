#pragma strict

var useNAT = false;
var ipPanel : Transform;
var ipInput : Transform;
var portInput : Transform;
var playerName : Transform;
var connectDialog : Transform;
var connectDialogButton : Transform;

private var goingToHost : boolean;
private var remoteIP = "127.0.0.1";
private var remotePort = 25000;
private var listenPort = 25000;
private var yourIP = "";
private var yourPort = "";



function Awake()
{
   Network.minimumAllocatableViewIDs = 500;
}

function OnGUI()
{
   var e : Event = Event.current;
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

function OnPressBack()
{
   Network.Disconnect();
   GUIControl2.SwitchGUI(0); // Returns to main
}

function OnDialogBack()
{
   SetDialog(false, false);
}

function OnPressHost()
{
   SetDialog(true, true);
}

function OnPressConnectToGame()
{
   SetDialog(true, false);
}

function OnPressOkButton()
{
   // Create host
   if (goingToHost)
   {
      // Creating server
      Network.Disconnect();
      listenPort = remotePort = parseInt(portInput.GetComponent(UILabel).text);
      Network.InitializeServer(32, listenPort, useNAT);
      // Notify our objects that the level and the network is ready
      //for (var go : GameObject in FindObjectsOfType(GameObject))
         //go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);
      Game.hostType = 1;
      Game.control.NewNetworkGame();
   
      GUIControl.SwitchGUI(101);
      GUIControl2.SwitchGUI(-1);
   }
   else // connect to host
   {
      Network.Disconnect();
      remoteIP = ipInput.GetComponent(UILabel).text;
      remotePort = parseInt(portInput.GetComponent(UILabel).text);
      Game.player.nameID = playerName.GetComponent(UILabel).text;
      // Connecting to the server
      Network.Connect(remoteIP, remotePort);
      Debug.Log("Connect: "+remoteIP+":"+remotePort );
      Game.hostType = 2;
   }
}

function OnSwitchTo()
{
   Network.Disconnect();
   Game.control.roundInProgress = false;
   Game.control.matchInProgress = false;
   Game.control.allowNewConnections = true;
   Game.player.isReady = false;
   Game.player.teamID = 1;
}

function OnSwitchFrom()
{
   SetDialog(false, false);
}

private function SetDialog(active : boolean, hosting : boolean)
{
   goingToHost = hosting;
   connectDialogButton.GetComponent(UILabel).text = (hosting) ? "Host" : "Connect";
   Utility.SetActiveRecursiveForce(connectDialog, active);
   Utility.SetActiveRecursiveForce(ipPanel, (active && !hosting));
}
