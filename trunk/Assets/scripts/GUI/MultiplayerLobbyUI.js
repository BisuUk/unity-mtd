#pragma strict

var textStyle : GUIStyle;

static var guiID : int = 101;
/*
private var buttonWidth : int;
private var buttonHeight : int;
*/
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
/*
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
*/
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

function OnSwitchGUI(id : int)
{
   enabled = (id == guiID);
}

function OnSwitchTo()
{
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
      pi.gameObject.active = true;
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
            wgo.GetComponent(UIPopupList).selection = (pd.teamID==1) ? "Pigmee" : "Inkee";
            wgo.GetComponent(UIButton).isEnabled = (pd.netPlayer == Network.player);
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
   GUIControl2.SwitchGUI(1);
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
   Game.control.InitRound();
}

function OnKick()
{
   //Network.CloseConnection(pd.netPlayer, true);
}