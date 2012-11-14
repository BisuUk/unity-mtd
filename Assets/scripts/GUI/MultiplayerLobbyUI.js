#pragma strict
#pragma downcast

var playerInfo : Transform[];
var chatInput : UIInput;
var chatOutput : UITextList;
var startGame : UIButton;
var modeList : Transform;
var mapList : Transform;
var mapImage : Transform;

function OnGUI()
{
   var e : Event = Event.current;

   // ESC returns to main
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            OnBack();
         break;
      }
   }
}

function OnSwitchTo()
{
   for(var t : Transform in playerInfo)
      Utility.SetActiveRecursiveForceOnly(t, true);

   chatOutput.Clear();

   Utility.SetActiveRecursive(startGame.transform, Network.isServer);
   OnRefreshPlayerData();
}

function OnRefreshPlayerData()
{
   var i : int = 0;
   var pi : Transform;
   var widget : Transform;
   var wgo : GameObject;
   var activateStartGame : boolean = true;

   for (var pd : PlayerData in Game.control.players.Values)
   {
      pi = playerInfo[i];
      pi.GetComponent(MultiplayerLobbyPanelInfo).player = pd.netPlayer;
      for (widget in pi)
      {
         wgo = widget.gameObject;
         if (wgo.name=="Name")
         {
            wgo.active = true;
            wgo.GetComponent(UILabel).text = pd.nameID;
         }
         else if (wgo.name=="Race")
         {
            Utility.SetActiveRecursive(widget, true);
            var pul : UIPopupList = wgo.GetComponent(UIPopupList);

            // Hack to get around NGUIs assignment operator firing an event
            var evr : GameObject = pul.eventReceiver;
            pul.eventReceiver = null;
            pul.selection = (pd.teamID==1) ? "Pigmee" : "Inkee";
            pul.eventReceiver = evr;

            wgo.GetComponent(UIButton).isEnabled = (pd.netPlayer == Network.player && !pd.isReady);
         }
         else if (wgo.name=="Kick")
         {
            Utility.SetActiveRecursive(widget, (Network.isServer && (pd != Game.player)));
         }
         else if (wgo.name=="Ready")
         {
            Utility.SetActiveRecursive(widget, true);
            widget.FindChild("Label").GetComponent(UILabel).text = (pd.isReady) ? "X" : "";
            wgo.GetComponent(UIButton).isEnabled = (pd.netPlayer == Network.player);
            if (!pd.isReady)
               activateStartGame = false;
            //Debug.Log("OnRef:Ready="+wgo.Find("Label").GetComponent(UILabel).text);
         }
         else
         {
            Utility.SetActiveRecursive(widget, false);
         }
      }
      i++;
   }

   // Show EMPTY join area(s)
   while (i<Game.control.maxPlayers)
   {
      pi = playerInfo[i];
      pi.gameObject.active = true;
      for (widget in pi)
      {
         wgo = widget.gameObject;
         Utility.SetActiveRecursive(widget, (wgo.name=="Empty"));
      }
      i++;
   }


   startGame.isEnabled = activateStartGame;
}

function OnReady()
{
   Game.player.isReady = !Game.player.isReady;

   if (Network.isServer)
      Game.control.ToServerReady(Game.player.isReady, new NetworkMessageInfo());
   else
      Game.control.netView.RPC("ToServerReady", RPCMode.Server, Game.player.isReady);
}

function OnBack()
{
   UIControl.SwitchUI(1);
}

function OnChat(msg : String)
{
   chatOutput.Add(msg);
}

function OnChatSubmit()
{
   if (chatOutput != null)
   {
      // It's a good idea to strip out all symbols as we don't want user input to alter colors, add new lines, etc
      var text : String = NGUITools.StripSymbols(chatInput.text);
      if (!String.IsNullOrEmpty(text))
      {
         Game.control.SendChat(text);
         chatInput.text = "";
         chatInput.selected = false;
      }
   }
}

function OnSelectRace(selectedItemName : String)
{
   // NGUI likes to fire this event at startup
   if (Network.peerType == NetworkPeerType.Disconnected)
      return;

   //Game.player.teamID = (Game.player.teamID==1) ? 2 : 1;
   Game.player.teamID = (selectedItemName=="Pigmee") ? 1 : 2;
   if (Network.isServer)
      Game.control.ToServerChangeTeam(Game.player.teamID, new NetworkMessageInfo());
   else
      Game.control.netView.RPC("ToServerChangeTeam", RPCMode.Server, Game.player.teamID);
}

function OnStartGame()
{
   // TEMP
   Game.control.InitLevel(GameModeType.GAMEMODE_TD, "map2");
}

function OnKick(player : NetworkPlayer)
{
   Network.CloseConnection(player, true);
}