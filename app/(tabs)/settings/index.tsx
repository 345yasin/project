import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { 
  LogOut, 
  User, 
  Users, 
  Shield, 
  ChevronRight,
  Settings as SettingsIcon 
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, signOut, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    );
  };

  const settingsItems = [
    ...(isAdmin ? [{
      id: 'users',
      title: 'User Management',
      subtitle: 'Manage users and permissions',
      icon: Users,
      onPress: () => router.push('/settings/users'),
    }] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.profileIcon}>
              <User size={32} color="#2563eb" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.full_name || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleContainer}>
                <Shield size={16} color={user?.role === 'admin' ? '#059669' : '#6b7280'} />
                <Text style={[
                  styles.roleText,
                  user?.role === 'admin' && styles.adminRoleText
                ]}>
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Items */}
        {settingsItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            {settingsItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.settingItem}
                onPress={item.onPress}
              >
                <View style={styles.settingIcon}>
                  <item.icon size={24} color="#6b7280" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingIcon}>
              <LogOut size={24} color="#ef4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, styles.logoutText]}>
                Sign Out
              </Text>
              <Text style={styles.settingSubtitle}>
                Sign out of your account
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileIcon: {
    backgroundColor: '#dbeafe',
    borderRadius: 32,
    padding: 16,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  adminRoleText: {
    color: '#059669',
  },
  settingItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#ef4444',
  },
});