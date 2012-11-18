#pragma strict

var useNAT = false;
var connectDialog : Transform;
var ipPanel : Transform;
var ipInputLabel : UILabel;
var portInputLabel : UILabel;
var playerNameInputLabel : UILabel;
var connectDialogButtonLabel : UILabel;

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

function OnSwitchTo()
{
   Network.Disconnect();
   Game.control.roundInProgress = false;
   Game.control.gameInProgress = false;
   Game.control.allowNewConnections = true;
   Game.player.isReady = false;
   Game.player.teamID = 1;
}

function OnSwitchFrom()
{
   SetDialog(false, false);
}

function OnPressBack()
{
   Network.Disconnect();
   UIControl.SwitchUI(0); // Returns to main
}

function OnPressHost()
{
   SetDialog(true, true);
}

function OnPressConnectToGame()
{
   SetDialog(true, false);
}

private function SetDialog(pActive : boolean, hosting : boolean)
{
   goingToHost = hosting;
   connectDialogButtonLabel.text = (hosting) ? "Host" : "Connect";
   connectDialog.gameObject.SetActive(pActive);
   ipPanel.gameObject.SetActive((pActive && !hosting));
}

function OnPressDialogBack()
{
   SetDialog(false, false);
}

function OnPressDialogOk()
{
   Game.player.nameID = playerNameInputLabel.text;
   // Create host
   if (goingToHost)
   {
      // Creating server
      Network.Disconnect();
      listenPort = remotePort = parseInt(portInputLabel.text);
      Network.InitializeServer(32, listenPort, useNAT);
      Game.hostType = 1;
      Game.control.NewNetworkGame();
   
      //GUIControl.SwitchGUI(101);
      UIControl.SwitchUI(2);
   }
   else // connect to host
   {
      Network.Disconnect();
      remoteIP = ipInputLabel.text;
      remotePort = parseInt(portInputLabel.text);
      Game.player.nameID = playerNameInputLabel.text;
      // Connecting to the server
      Network.Connect(remoteIP, remotePort);
      Debug.Log("Connect: "+remoteIP+":"+remotePort );
      Game.hostType = 2;
   }
}
