#pragma strict

var lobby : MultiplayerLobbyUI;
var player : NetworkPlayer;

function OnKick()
{
   lobby.OnKick(player);
}